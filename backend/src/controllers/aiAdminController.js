/**
 * AI 管理控制器（aiAdminController）—— 管理员端新增
 * ------------------------------------------------------------------
 * 支撑管理端「AI 管理」三大能力，仅管理员可用：
 *   调用记录：getLogs / getLogDetail / deleteLog
 *     - 查看 AI 各场景的调用记录（推荐/对话/文案生成/评价分析）
 *   生成内容：getGeneratedContents
 *     - 汇总 AI 生成的内容（商品文案、评价分析结果），支持查看与删除
 *   服务配置：getConfig / updateConfig / testConfig
 *     - 在线维护 API 密钥、接口地址、模型、温度、最大 token 与总开关；
 *       密钥回显时脱敏；保存后 AI 接口优先读取数据库配置
 */
const { Op, fn, col } = require('sequelize');
const AiLog = require('../models/AiLog');
const AiConfig = require('../models/AiConfig');
const User = require('../models/User');
const aiController = require('./aiController');
const { success, error, notFound } = require('../utils/response');

// 密钥脱敏：仅保留前4位与后4位
const maskKey = (key) => {
  if (!key) return '';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
};

// 生成类场景（用于「AI生成内容」页）
const GENERATE_SCENES = ['product-copy', 'review-analysis'];

/* ============================ 调用记录 ============================ */

// AI 调用记录列表 + 概览统计
exports.getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, scene, status, keyword } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (scene) where.scene = scene;
    if (status) where.status = status;
    if (keyword) {
      where[Op.or] = [
        { input: { [Op.like]: `%${keyword}%` } },
        { output: { [Op.like]: `%${keyword}%` } },
        { scene_name: { [Op.like]: `%${keyword}%` } }
      ];
    }

    const { count, rows } = await AiLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'nickname'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [total, failedCount, todayCount] = await Promise.all([
      AiLog.count(),
      AiLog.count({ where: { status: 'failed' } }),
      AiLog.count({ where: { created_at: { [Op.gte]: startOfToday } } })
    ]);

    const avgRow = await AiLog.findOne({
      attributes: [[fn('AVG', col('duration_ms')), 'avgDuration']],
      raw: true
    });

    return success(
      res,
      {
        logs: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        },
        stats: {
          total,
          failedCount,
          successCount: total - failedCount,
          todayCount,
          avgDuration: Math.round(Number(avgRow?.avgDuration || 0))
        }
      },
      '获取AI调用记录成功'
    );
  } catch (err) {
    console.error('获取AI调用记录失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 调用记录详情
exports.getLogDetail = async (req, res) => {
  try {
    const log = await AiLog.findByPk(req.params.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'nickname'] }]
    });
    if (!log) return notFound(res, '调用记录不存在');
    return success(res, log, '获取调用详情成功');
  } catch (err) {
    console.error('获取AI调用详情失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 删除调用记录
exports.deleteLog = async (req, res) => {
  try {
    const log = await AiLog.findByPk(req.params.id);
    if (!log) return notFound(res, '调用记录不存在');
    await log.destroy();
    return success(res, null, '删除成功');
  } catch (err) {
    console.error('删除AI调用记录失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

/* ============================ AI 生成内容 ============================ */

// AI 生成内容列表（商品文案 / 评价分析）
exports.getGeneratedContents = async (req, res) => {
  try {
    const { page = 1, limit = 10, scene, keyword } = req.query;
    const offset = (page - 1) * limit;

    const where = { scene: scene || { [Op.in]: GENERATE_SCENES } };
    if (keyword) {
      where[Op.or] = [
        { input: { [Op.like]: `%${keyword}%` } },
        { output: { [Op.like]: `%${keyword}%` } }
      ];
    }

    const { count, rows } = await AiLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'nickname'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return success(
      res,
      {
        contents: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      },
      '获取AI生成内容成功'
    );
  } catch (err) {
    console.error('获取AI生成内容失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

/* ============================ 服务配置 ============================ */

// 读取 AI 服务配置（密钥脱敏）
exports.getConfig = async (req, res) => {
  try {
    const row = await AiConfig.findByPk(1);

    const envKey = process.env.DEEPSEEK_API_KEY || '';
    const config = {
      base_url: row?.base_url || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      model: row?.model || process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      temperature: row?.temperature != null ? row.temperature : 0.7,
      max_tokens: row?.max_tokens || 2000,
      enabled: row ? row.enabled !== false : true,
      updated_at: row?.updated_at || null
    };
    // 数据库中的密钥（可能为空，为空则回退环境变量）
    const dbKey = row?.api_key || '';

    return success(
      res,
      {
        ...config,
        api_key_masked: maskKey(dbKey || envKey),
        // 是否已配置可用密钥（数据库或环境变量）
        key_configured: !!(dbKey || envKey),
        // 密钥来源：database 数据库 / env 环境变量 / none 未配置
        key_source: dbKey ? 'database' : envKey ? 'env' : 'none'
      },
      '获取AI服务配置成功'
    );
  } catch (err) {
    console.error('获取AI配置失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 更新 AI 服务配置
exports.updateConfig = async (req, res) => {
  try {
    const { api_key, base_url, model, temperature, max_tokens, enabled } = req.body;

    const updateData = {};
    // 仅当传入的是新密钥（非脱敏占位）时才更新
    if (api_key !== undefined && api_key !== '' && !String(api_key).includes('****')) {
      updateData.api_key = api_key;
    }
    if (base_url !== undefined) updateData.base_url = base_url;
    if (model !== undefined) updateData.model = model;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (max_tokens !== undefined) updateData.max_tokens = max_tokens;
    if (enabled !== undefined) updateData.enabled = enabled;
    updateData.updated_by = req.user.id;

    let row = await AiConfig.findByPk(1);
    if (row) {
      await row.update(updateData);
    } else {
      row = await AiConfig.create({ id: 1, ...updateData });
    }

    return success(res, null, 'AI服务配置已保存');
  } catch (err) {
    console.error('更新AI配置失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 测试 AI 服务连通性
exports.testConfig = async (req, res) => {
  try {
    const { api_key, base_url, model, temperature, max_tokens } = req.body;

    // 未传入新密钥时，沿用当前有效配置（数据库或环境变量）
    const current = await aiController.getAiConfig();
    const config = {
      api_key: api_key && !String(api_key).includes('****') ? api_key : current.api_key,
      base_url: base_url || current.base_url,
      model: model || current.model,
      temperature: temperature != null ? temperature : current.temperature,
      max_tokens: max_tokens || current.max_tokens,
      enabled: true
    };

    if (!config.api_key) {
      return error(res, '尚未配置 AI 接口密钥', 400);
    }

    const startedAt = Date.now();
    const reply = await aiController.callDeepSeek(
      [{ role: 'user', content: '请回复“连接成功”四个字。' }],
      { config }
    );

    return success(
      res,
      { reply: (reply || '').trim(), duration: Date.now() - startedAt, model: config.model },
      'AI服务连接测试成功'
    );
  } catch (err) {
    console.error('AI服务测试失败:', err);
    return error(res, `AI服务连接失败：${err.message}`, 400);
  }
};
