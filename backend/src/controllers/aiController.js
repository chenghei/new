/**
 * AI购物助手控制器（aiController）—— 本次新增
 * ------------------------------------------------------------------
 * 接入 DeepSeek 大模型（兼容 OpenAI 的 /chat/completions 协议），
 * 结合用户在商城内的行为数据（浏览、收藏、购买）提供智能导购能力。
 *
 * 提供接口：
 *   getRecommendations  GET  /api/ai/recommendations
 *       AI个性化推荐：把用户行为画像 + 在售候选商品交给大模型，
 *       由其挑选最多6个商品并生成推荐理由；
 *       AI不可用或无行为数据时自动降级为“热销榜”推荐，保证接口永远可用。
 *
 *   chat                POST /api/ai/chat
 *       AI购物助手对话：以“小购”人设与用户多轮对话，
 *       system prompt 中注入用户行为画像与在售商品清单，
 *       要求模型按「商品名｜¥价格｜推荐理由」格式输出，便于前端解析成商品卡片。
 *
 * 环境变量（见 .env）：
 *   DEEPSEEK_API_KEY   DeepSeek 接口密钥（必填）
 *   DEEPSEEK_BASE_URL  接口地址（默认 https://api.deepseek.com）
 *   DEEPSEEK_MODEL     模型名（默认 deepseek-chat）
 */
const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const Order = require('../models/Order');
const Favorite = require('../models/Favorite');
const BrowseHistory = require('../models/BrowseHistory');
const { success, error } = require('../utils/response');
const AiConfig = require('../models/AiConfig');
const AiLog = require('../models/AiLog');
const { cacheGet, cacheSet, acquireSlot, releaseSlot } = require('../config/redis');

// 场景中文名映射：用于写入 AI 调用记录，便于管理端展示
const SCENE_NAMES = {
  recommend: 'AI个性化推荐',
  chat: 'AI导购对话',
  'product-copy': 'AI商品文案生成',
  'review-analysis': 'AI评价分析'
};

/**
 * 读取 AI 服务配置：优先取数据库中的平台配置（管理员端可维护），
 * 未配置项回退到 .env 环境变量，保证开箱即用。
 */
const getAiConfig = async () => {
  const envConfig = {
    api_key: process.env.DEEPSEEK_API_KEY || '',
    base_url: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    temperature: 0.7,
    max_tokens: 2000,
    enabled: true
  };

  try {
    const row = await AiConfig.findByPk(1);
    if (!row) return envConfig;
    return {
      api_key: row.api_key || envConfig.api_key,
      base_url: row.base_url || envConfig.base_url,
      model: row.model || envConfig.model,
      temperature: row.temperature != null ? row.temperature : envConfig.temperature,
      max_tokens: row.max_tokens || envConfig.max_tokens,
      enabled: row.enabled !== false
    };
  } catch (err) {
    return envConfig;
  }
};

/**
 * 记录 AI 调用日志（写入失败不影响主流程）
 */
const logAiCall = async ({ userId, scene, input, output, status = 'success', errorMessage = null, duration = 0, model = null }) => {
  try {
    await AiLog.create({
      user_id: userId || null,
      scene,
      scene_name: SCENE_NAMES[scene] || scene,
      input: input ? String(input).slice(0, 2000) : null,
      output: output ? String(output).slice(0, 4000) : null,
      status,
      error_message: errorMessage,
      duration_ms: Math.round(duration),
      model
    });
  } catch (err) {
    console.warn('记录AI调用日志失败:', err.message);
  }
};

/**
 * 调用 DeepSeek 大模型（OpenAI 兼容协议）
 * @param {Array}  messages  对话消息数组 [{role, content}]
 * @param {Object} options   jsonMode=true 时强制模型输出 JSON 对象；config 为 AI 服务配置
 * @returns {string} 模型回复的文本内容
 * 说明：使用 AbortController 做 30 秒超时控制，避免大模型抖动拖垮接口
 */
const callDeepSeek = async (messages, { jsonMode = false, config } = {}) => {
  const cfg = config || (await getAiConfig());

  if (!cfg.enabled) {
    throw new Error('AI服务已在管理端停用');
  }
  if (!cfg.api_key) {
    throw new Error('未配置AI接口密钥');
  }

  // 并发闸门：限制全局同时在跑的 AI 请求数，避免突发流量打爆上游
  const concurrencyKey = 'ai:concurrency';
  const maxConcurrency = Number(process.env.AI_MAX_CONCURRENCY) || 5;
  const gotSlot = await acquireSlot(concurrencyKey, maxConcurrency, 60);
  if (!gotSlot) {
    const busyErr = new Error('AI服务繁忙，请稍后再试');
    busyErr.code = 'AI_BUSY';
    throw busyErr;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const body = {
      model: cfg.model,
      messages,
      temperature: cfg.temperature,
      max_tokens: cfg.max_tokens
    };
    if (jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const resp = await fetch(`${cfg.base_url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.api_key}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`DeepSeek接口错误 ${resp.status}: ${text}`);
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timer);
    await releaseSlot(concurrencyKey);
  }
};

// 导出供 AI 管理接口复用
exports.getAiConfig = getAiConfig;
exports.callDeepSeek = callDeepSeek;

/**
 * 汇总用户行为画像（浏览、收藏、购买各取最近10条）
 * 输出格式示例："iPhone15(数码家电,¥5999)"，供拼装 prompt 使用
 */
const buildUserBehaviorSummary = async (userId) => {
  const [browses, favorites, orders] = await Promise.all([
    BrowseHistory.findAll({
      where: { user_id: userId },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'price'],
        include: [{ model: Category, as: 'category', attributes: ['name'] }]
      }],
      order: [['updated_at', 'DESC']],
      limit: 10
    }),
    Favorite.findAll({
      where: { user_id: userId },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'price'],
        include: [{ model: Category, as: 'category', attributes: ['name'] }]
      }],
      order: [['created_at', 'DESC']],
      limit: 10
    }),
    Order.findAll({
      where: { user_id: userId, status: ['paid', 'shipped', 'completed'] },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'price'],
        include: [{ model: Category, as: 'category', attributes: ['name'] }]
      }],
      order: [['created_at', 'DESC']],
      limit: 10
    })
  ]);

  const fmt = (p) => p ? `${p.name}(${p.category?.name || '未分类'},¥${p.price})` : '';

  return {
    browses: browses.map(b => fmt(b.product)).filter(Boolean),
    favorites: favorites.map(f => fmt(f.product)).filter(Boolean),
    purchases: orders.map(o => fmt(o.product)).filter(Boolean)
  };
};

/**
 * 获取候选商品清单：在售商品按销量取前50个，
 * 裁剪为精简字段（id/名称/分类/价格/销量/80字描述），控制 prompt 长度
 */
const getCandidateProducts = async () => {
  const products = await Product.findAll({
    where: { status: 'active' },
    include: [{ model: Category, as: 'category', attributes: ['name'] }],
    order: [['sales', 'DESC']],
    limit: 50
  });

  return products.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category?.name || '未分类',
    price: p.price,
    sales: p.sales,
    description: (p.description || '').slice(0, 80)
  }));
};

// 兜底推荐：AI不可用/超时/解析失败时返回热销商品，保证推荐位永远有内容
const fallbackRecommendations = async (limit = 6) => {
  const products = await Product.findAll({
    where: { status: 'active' },
    include: [
      { model: Category, as: 'category', attributes: ['id', 'name'] },
      { model: User, as: 'merchant', attributes: ['id', 'username', 'nickname'] }
    ],
    order: [['sales', 'DESC']],
    limit
  });

  return products.map(p => ({
    product: p,
    reason: '热销商品，广受用户欢迎'
  }));
};

// AI个性化推荐
exports.getRecommendations = async (req, res) => {
  try {
    const { user } = req;

    // 优先读缓存：同一用户短时间内重复请求直接返回，避免重复调用大模型（省钱、提速）
    const cacheKey = `ai:rec:${user.id}`;
    const cacheTtl = Number(process.env.AI_CACHE_TTL) || 600;
    const cached = await cacheGet(cacheKey);
    if (cached && Array.isArray(cached.recommendations) && cached.recommendations.length > 0) {
      return success(res, { ...cached, cached: true }, 'AI推荐成功');
    }

    const [behavior, candidates] = await Promise.all([
      buildUserBehaviorSummary(user.id),
      getCandidateProducts()
    ]);

    if (candidates.length === 0) {
      return success(res, { recommendations: [], source: 'empty' }, '暂无可推荐商品');
    }

    // 没有任何行为数据时直接走热销兜底
    const noBehavior = !behavior.browses.length && !behavior.favorites.length && !behavior.purchases.length;

    const cfg = await getAiConfig();
    const startedAt = Date.now();

    try {
      if (noBehavior) throw new Error('no-behavior');

      const prompt = [
        '你是一位资深电商导购专家。请根据用户的行为画像，从候选商品中挑选最多6个最符合其需求的商品，并为每个商品给出一句有说服力的推荐理由（30字以内，中文）。',
        '',
        '【用户行为画像】',
        `最近浏览：${behavior.browses.join('、') || '无'}`,
        `收藏商品：${behavior.favorites.join('、') || '无'}`,
        `购买记录：${behavior.purchases.join('、') || '无'}`,
        '',
        '【候选商品】（JSON）',
        JSON.stringify(candidates),
        '',
        '请严格输出JSON，格式为：{"recommendations":[{"product_id":数字,"reason":"推荐理由"}]}，不要输出任何其他内容。'
      ].join('\n');

      const content = await callDeepSeek(
        [{ role: 'user', content: prompt }],
        { jsonMode: true, config: cfg }
      );

      const parsed = JSON.parse(content);
      const items = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];

      const ids = items.map(i => parseInt(i.product_id)).filter(Boolean);
      const products = await Product.findAll({
        where: { id: ids, status: 'active' },
        include: [
          { model: Category, as: 'category', attributes: ['id', 'name'] },
          { model: User, as: 'merchant', attributes: ['id', 'username', 'nickname'] }
        ]
      });

      const productMap = new Map(products.map(p => [p.id, p]));
      const recommendations = items
        .filter(i => productMap.has(parseInt(i.product_id)))
        .slice(0, 6)
        .map(i => ({
          product: productMap.get(parseInt(i.product_id)),
          reason: String(i.reason || '为你精选推荐')
        }));

      if (recommendations.length > 0) {
        // 仅缓存 AI 成功结果（兜底热销不缓存，避免上游恢复后仍返回旧兜底数据）
        await cacheSet(cacheKey, { recommendations, source: 'ai' }, cacheTtl);
        await logAiCall({
          userId: user.id,
          scene: 'recommend',
          input: `浏览${behavior.browses.length}条/收藏${behavior.favorites.length}条/购买${behavior.purchases.length}条`,
          output: recommendations.map((r) => `${r.product.name}：${r.reason}`).join('；'),
          duration: Date.now() - startedAt,
          model: cfg.model
        });
        return success(res, { recommendations, source: 'ai' }, 'AI推荐成功');
      }
      throw new Error('empty-ai-result');
    } catch (aiErr) {
      console.warn('AI推荐降级:', aiErr.message);
      const recommendations = await fallbackRecommendations(6);
      await logAiCall({
        userId: user.id,
        scene: 'recommend',
        input: `浏览${behavior.browses.length}条/收藏${behavior.favorites.length}条/购买${behavior.purchases.length}条`,
        output: `降级返回热销商品 ${recommendations.length} 个`,
        status: noBehavior ? 'success' : 'failed',
        errorMessage: noBehavior ? '无用户行为数据，返回热销兜底' : aiErr.message,
        duration: Date.now() - startedAt,
        model: cfg.model
      });
      return success(res, { recommendations, source: noBehavior ? 'hot' : 'fallback' }, '为你推荐热销商品');
    }
  } catch (err) {
    console.error('AI推荐失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// AI购物助手对话
exports.chat = async (req, res) => {
  try {
    const { user } = req;
    const { messages = [] } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return error(res, '对话内容不能为空', 400);
    }

    // 只保留最近10轮，避免上下文过长
    const history = messages
      .filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
      .slice(-10);

    const [behavior, candidates] = await Promise.all([
      buildUserBehaviorSummary(user.id),
      getCandidateProducts()
    ]);

    const systemPrompt = [
      `你叫"小购"，是一位热情专业的AI购物助手，正在为商城用户"${user.nickname || user.username}"服务。`,
      '你的任务：理解用户的购物需求，结合其行为画像推荐商城内真实在售的商品，并说明推荐理由。',
      '',
      '【用户行为画像】',
      `最近浏览：${behavior.browses.join('、') || '无'}`,
      `收藏商品：${behavior.favorites.join('、') || '无'}`,
      `购买记录：${behavior.purchases.join('、') || '无'}`,
      '',
      '【商城在售商品】（JSON）',
      JSON.stringify(candidates),
      '',
      '回复要求：',
      '1. 使用亲切自然的中文口语化表达，可适当使用emoji；',
      '2. 推荐商品时必须从在售商品中选择，并标注商品价格；',
      '3. 推荐商品时另起一行，使用格式「商品名｜¥价格｜推荐理由」，方便前端解析展示；',
      '4. 不要编造商城中不存在的商品；',
      '5. 回答控制在200字以内。'
    ].join('\n');

    const cfg = await getAiConfig();
    const startedAt = Date.now();
    const lastUserMessage = [...history].reverse().find((m) => m.role === 'user');

    try {
      const reply = await callDeepSeek(
        [{ role: 'system', content: systemPrompt }, ...history],
        { config: cfg }
      );

      await logAiCall({
        userId: user.id,
        scene: 'chat',
        input: lastUserMessage?.content || '',
        output: reply,
        duration: Date.now() - startedAt,
        model: cfg.model
      });

      return success(res, { reply }, '回复成功');
    } catch (err) {
      console.error('AI对话失败:', err);
      await logAiCall({
        userId: user.id,
        scene: 'chat',
        input: lastUserMessage?.content || '',
        status: 'failed',
        errorMessage: err.message,
        duration: Date.now() - startedAt,
        model: cfg.model
      });
      if (err.code === 'AI_BUSY') {
        return error(res, 'AI助手当前请求较多，请稍后再试', 429);
      }
      if (err.name === 'AbortError') {
        return error(res, 'AI助手响应超时，请稍后再试', 504);
      }
      return error(res, 'AI助手暂时不可用，请稍后再试', 500);
    }
  } catch (err) {
    console.error('AI对话失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

/**
 * AI 商品文案生成（商家端）
 * POST /api/ai/product-copy
 * 入参：{ name, category, features }
 * 出参：{ title, selling_points: [], description }
 * 说明：商家填写商品名称、分类、特点等基础信息后，由大模型自动生成
 *       商品标题、卖点与详情描述，减少商家编写文案的成本。
 */
exports.generateProductCopy = async (req, res) => {
  try {
    const { name, category, features } = req.body;

    if (!name) {
      return error(res, '请先填写商品名称', 400);
    }

    const prompt = [
      '你是一位资深电商运营专家，请根据商家提供的商品基础信息，生成规范、有吸引力的商品文案。',
      '',
      `【商品名称】${name}`,
      `【商品分类】${category || '未填写'}`,
      `【商品特点】${features || '未填写'}`,
      '',
      '要求：',
      '1. 标题：30字以内，突出核心卖点，适合电商平台展示；',
      '2. 卖点：提炼3-5条，每条15字以内，简洁有力；',
      '3. 描述：150-250字，分段描述，突出卖点与使用场景，语言自然有感染力；',
      '4. 不要编造商品不具备的功能。',
      '',
      '请严格输出JSON：{"title":"","selling_points":[""],"description":""}，不要输出其他内容。'
    ].join('\n');

    const cfg = await getAiConfig();
    const startedAt = Date.now();
    const cfgInput = `商品：${name}；分类：${category || '未填写'}；特点：${features || '未填写'}`;

    try {
      const content = await callDeepSeek(
        [{ role: 'user', content: prompt }],
        { jsonMode: true, config: cfg }
      );
      const parsed = JSON.parse(content);

      const result = {
        title: parsed.title || name,
        selling_points: Array.isArray(parsed.selling_points) ? parsed.selling_points : [],
        description: parsed.description || ''
      };

      await logAiCall({
        userId: req.user?.id,
        scene: 'product-copy',
        input: cfgInput,
        output: `标题：${result.title}\n卖点：${result.selling_points.join('、')}\n描述：${result.description}`,
        duration: Date.now() - startedAt,
        model: cfg.model
      });

      return success(res, result, 'AI文案生成成功');
    } catch (err) {
      console.error('AI生成商品文案失败:', err);
      await logAiCall({
        userId: req.user?.id,
        scene: 'product-copy',
        input: cfgInput,
        status: 'failed',
        errorMessage: err.message,
        duration: Date.now() - startedAt,
        model: cfg.model
      });
      if (err.name === 'AbortError') {
        return error(res, 'AI生成超时，请稍后再试', 504);
      }
      return error(res, 'AI文案生成失败，请稍后再试', 500);
    }
  } catch (err) {
    console.error('AI生成商品文案失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

/**
 * AI 评价分析（商家端）
 * POST /api/ai/review-analysis
 * 入参：{ product_id? }  — 指定商品则分析该商品评价，否则分析本商家全部商品评价
 * 出参：{ summary, positives:[], negatives:[], concerns:[], faqs:[], suggestions:[] }
 * 说明：对评价文本做情感与主题分析，提取用户关注点、正面/负面评价与常见问题，
 *       大模型不可用时降级为基于评分的规则化摘要，保证接口可用。
 */
exports.analyzeReviews = async (req, res) => {
  try {
    const { user } = req;
    const { product_id } = req.body;

    const ProductModel = Product;
    const ReviewModel = require('../models/Review');

    // 确定分析范围：指定商品需校验归属，否则取本商家全部商品
    let productIds;
    if (product_id) {
      const product = await ProductModel.findByPk(product_id, { attributes: ['id', 'user_id'] });
      if (!product) {
        return error(res, '商品不存在', 404);
      }
      if (user.role !== 'admin' && product.user_id !== user.id) {
        return error(res, '无权限分析该商品评价', 403);
      }
      productIds = [product.id];
    } else {
      const products = await ProductModel.findAll({
        where: { user_id: user.id },
        attributes: ['id']
      });
      productIds = products.map((p) => p.id);
    }

    if (!productIds.length) {
      return error(res, '暂无可分析的评价', 400);
    }

    const reviews = await ReviewModel.findAll({
      where: { product_id: productIds, content: { [require('sequelize').Op.ne]: null } },
      include: [{ model: ProductModel, as: 'product', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
      limit: 100
    });

    const validReviews = reviews.filter((r) => (r.content || '').trim());
    if (!validReviews.length) {
      return error(res, '暂无可分析的文字评价', 400);
    }

    const total = validReviews.length;
    const avgRating = Number(
      (validReviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1)
    );
    const sentiment = {
      positive: validReviews.filter((r) => r.rating >= 4).length,
      neutral: validReviews.filter((r) => r.rating === 3).length,
      negative: validReviews.filter((r) => r.rating <= 2).length
    };

    const reviewText = validReviews
      .slice(0, 60)
      .map((r) => `[${r.rating}星] ${r.product?.name || ''}：${(r.content || '').slice(0, 80)}`)
      .join('\n');

    const prompt = [
      '你是一位电商数据分析师，请分析以下商品评价，帮助商家了解用户真实反馈并优化商品。',
      '',
      `【评价数据】共 ${total} 条，平均评分 ${avgRating} 分；好评 ${sentiment.positive} 条、中评 ${sentiment.neutral} 条、差评 ${sentiment.negative} 条。`,
      '【评价内容】',
      reviewText,
      '',
      '请严格输出JSON：',
      '{"summary":"整体评价总结(80字以内)",',
      ' "positives":["用户认可的正面点，3-5条"],',
      ' "negatives":["用户吐槽的负面点，3-5条"],',
      ' "concerns":["用户重点关注的因素，如质量/物流/性价比等，3-5条"],',
      ' "faqs":["从评价中提炼的常见问题，3-5条"],',
      ' "suggestions":["给商家的优化建议，3-5条"]}',
      '不要输出其他内容。'
    ].join('\n');

    const cfg = await getAiConfig();
    const startedAt = Date.now();
    const cfgInput = `分析范围：${product_id ? `商品ID ${product_id}` : '本店全部商品'}；评价共 ${total} 条，平均 ${avgRating} 分`;

    try {
      const content = await callDeepSeek(
        [{ role: 'user', content: prompt }],
        { jsonMode: true, config: cfg }
      );
      const parsed = JSON.parse(content);

      await logAiCall({
        userId: user.id,
        scene: 'review-analysis',
        input: cfgInput,
        output: `总结：${parsed.summary || ''}\n正面：${(parsed.positives || []).join('、')}\n负面：${(parsed.negatives || []).join('、')}\n关注点：${(parsed.concerns || []).join('、')}`,
        duration: Date.now() - startedAt,
        model: cfg.model
      });

      return success(
        res,
        {
          total,
          avgRating,
          sentiment,
          summary: parsed.summary || '',
          positives: parsed.positives || [],
          negatives: parsed.negatives || [],
          concerns: parsed.concerns || [],
          faqs: parsed.faqs || [],
          suggestions: parsed.suggestions || [],
          source: 'ai'
        },
        'AI评价分析成功'
      );
    } catch (aiErr) {
      // 大模型不可用时降级：基于评分与评论文本的规则化分析
      console.warn('AI评价分析降级:', aiErr.message);
      const good = validReviews.filter((r) => r.rating >= 4).slice(0, 3).map((r) => r.content.slice(0, 40));
      const bad = validReviews.filter((r) => r.rating <= 2).slice(0, 3).map((r) => r.content.slice(0, 40));

      await logAiCall({
        userId: user.id,
        scene: 'review-analysis',
        input: cfgInput,
        output: `降级规则化摘要：好评${sentiment.positive}/中评${sentiment.neutral}/差评${sentiment.negative}`,
        status: 'failed',
        errorMessage: aiErr.message,
        duration: Date.now() - startedAt,
        model: cfg.model
      });

      return success(
        res,
        {
          total,
          avgRating,
          sentiment,
          summary: `共 ${total} 条文字评价，平均评分 ${avgRating} 分，好评 ${sentiment.positive} 条、中评 ${sentiment.neutral} 条、差评 ${sentiment.negative} 条。`,
          positives: good.length ? good : ['暂无明确的正面评价要点'],
          negatives: bad.length ? bad : ['暂无明显负面评价'],
          concerns: ['质量', '物流速度', '性价比', '客服服务'],
          faqs: ['商品是否与描述一致？', '发货速度如何？', '售后处理是否及时？'],
          suggestions: ['关注差评中反复出现的共性问题并及时优化', '保持商品描述与实物一致'],
          source: 'fallback'
        },
        '评价分析完成（规则化摘要）'
      );
    }
  } catch (err) {
    console.error('AI评价分析失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};
