/**
 * 测试数据生成脚本（seed.js）
 * ------------------------------------------------------------------
 * 为商城三端（用户端 / 商家端 / 管理端）生成一套完整的演示数据：
 *   分类、商家（含待审核/已拒绝）、店铺、商品、订单（覆盖全部状态）、
 *   商品评价、售后申请（含异常）、收藏、购物车、浏览足迹、AI 调用记录
 *
 * 用法：
 *   node scripts/seed.js            // 仅在无商品数据时写入（避免重复）
 *   node scripts/seed.js --reset    // 先清空业务数据再重新生成
 *
 * 说明：所有生成的账号密码均为 123456（商家同样），管理员账号不受影响。
 */
require('dotenv').config();
const { Op } = require('sequelize');
const { sequelize } = require('../src/config/database');
const User = require('../src/models/User');
const Shop = require('../src/models/Shop');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const Review = require('../src/models/Review');
const AfterSale = require('../src/models/AfterSale');
const Favorite = require('../src/models/Favorite');
const Cart = require('../src/models/Cart');
const BrowseHistory = require('../src/models/BrowseHistory');
const AiLog = require('../src/models/AiLog');
const Address = require('../src/models/Address');

const RESET = process.argv.includes('--reset');
const PASSWORD = '123456';

/* ------------------------- 工具函数 ------------------------- */
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const pickMany = (arr, n) => {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) out.push(copy.splice(rand(0, copy.length - 1), 1)[0]);
  return out;
};
// 近 days 天内的随机时间
const daysAgo = (days, maxHour = 22) => {
  const d = new Date();
  d.setDate(d.getDate() - rand(0, days));
  d.setHours(rand(8, maxHour), rand(0, 59), rand(0, 59), 0);
  return d;
};
// 生成商品图片（远程文生图服务，仅在没有本地图片时作为兜底）
const img = (prompt, size = 'square_hd') =>
  `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
    prompt
  )}&image_size=${size}`;

// 本地图片清单（由 scripts/localizeImages.js 生成）。
// 存在时优先使用 backend/uploads 下的本地图片，保证离线可用、加载更快。
let LOCAL_IMAGES = null;
try {
  LOCAL_IMAGES = require('../uploads/local-images.json');
} catch (err) {
  LOCAL_IMAGES = null;
}

// 优先取本地图片（按顺序复用，保证每个商品/店铺拿到不同的图），否则回退远程地址
const localOr = (listName, index, fallback) => {
  const list = LOCAL_IMAGES && LOCAL_IMAGES[listName];
  if (!list || !list.length) return fallback;
  return list[index % list.length];
};

/* ------------------------- 基础数据定义 ------------------------- */
const CATEGORIES = [
  { name: '手机数码', description: '手机、耳机、智能设备等', sort: 1 },
  { name: '电脑办公', description: '笔记本、外设、办公用品', sort: 2 },
  { name: '家用电器', description: '厨房电器、生活电器', sort: 3 },
  { name: '服饰鞋包', description: '男装、女装、鞋靴箱包', sort: 4 },
  { name: '美妆护肤', description: '护肤、彩妆、洗护', sort: 5 },
  { name: '食品生鲜', description: '零食、饮品、生鲜', sort: 6 },
  { name: '家居百货', description: '收纳、清洁、家纺', sort: 7 },
  { name: '运动户外', description: '运动装备、户外用品', sort: 8 }
];

// 商家账号（前 4 个审核通过，第 5 个待审核，第 6 个已拒绝）
const MERCHANTS = [
  {
    username: 'merchant_digital',
    nickname: '数码优品旗舰店',
    shop: { shop_name: '数码优品旗舰店', business_category: '手机数码', contact_name: '张伟', contact_phone: '13800001111', business_license: '91310000MA1FL88801', address: '上海市浦东新区张江高科园区 88 号', description: '专注数码 3C，官方正品，闪电发货。', status: 'approved' }
  },
  {
    username: 'merchant_home',
    nickname: '品质家居馆',
    shop: { shop_name: '品质家居生活馆', business_category: '家居百货', contact_name: '李娜', contact_phone: '13800002222', business_license: '91310000MA1FL88802', address: '杭州市余杭区未来科技城 66 号', description: '让每一个家都更有温度，精选家居好物。', status: 'approved' }
  },
  {
    username: 'merchant_beauty',
    nickname: '美妆护肤优选',
    shop: { shop_name: '美妆护肤优选店', business_category: '美妆护肤', contact_name: '王芳', contact_phone: '13800003333', business_license: '91310000MA1FL88803', address: '广州市天河区珠江新城 12 号', description: '大牌正品美妆，专柜同源，假一赔十。', status: 'approved' }
  },
  {
    username: 'merchant_food',
    nickname: '食光零食铺',
    shop: { shop_name: '食光零食铺', business_category: '食品生鲜', contact_name: '陈强', contact_phone: '13800004444', business_license: '91310000MA1FL88804', address: '成都市高新区天府大道 300 号', description: '好吃不贵，办公室零食一站式购齐。', status: 'approved' }
  },
  {
    username: 'merchant_fashion',
    nickname: '潮流服饰工作室',
    shop: { shop_name: '潮流服饰工作室', business_category: '服饰鞋包', contact_name: '刘洋', contact_phone: '13800005555', business_license: '91310000MA1FL88805', address: '北京市朝阳区三里屯 5 号', description: '原创设计，做年轻人的潮流穿搭。', status: 'pending' }
  },
  {
    username: 'merchant_old',
    nickname: '旧物杂货铺',
    shop: { shop_name: '旧物杂货铺', business_category: '家居百货', contact_name: '赵敏', contact_phone: '13800006666', business_license: '待补充', address: '武汉市江汉区解放大道 1 号', description: '二手闲置交易。', status: 'rejected', reject_reason: '营业执照信息不完整，且经营类目与资质不符，请补充有效资质后重新提交。' }
  }
];

// 买家账号（region/detail 用于生成收货地址簿，下单结算时自动带入）
const BUYERS = [
  { username: 'buyer_lin', nickname: '林小满', phone: '13911112222', address: '上海市徐汇区漕溪北路 100 号 3 单元 501', region: '上海市 徐汇区', detail: '漕溪北路100号 3单元501室' },
  { username: 'buyer_chen', nickname: '陈一鸣', phone: '13922223333', address: '杭州市西湖区文三路 258 号 B 座 1203', region: '杭州市 西湖区', detail: '文三路258号 B座1203' },
  { username: 'buyer_zhao', nickname: '赵小鱼', phone: '13933334444', address: '广州市越秀区中山五路 33 号 808', region: '广州市 越秀区', detail: '中山五路33号 808室' },
  { username: 'buyer_sun', nickname: '孙悦然', phone: '13944445555', address: '成都市武侯区天府三街 199 号 2 栋 1802', region: '成都市 武侯区', detail: '天府三街199号 2栋1802' }
];

// 商品（merchantKey 对应上面的 username，cat 对应分类名）
const PRODUCTS = [
  // 数码优品
  { m: 'merchant_digital', cat: '手机数码', name: '星耀 Pro 5G 智能手机 12GB+256GB', price: 3999, stock: 200, img: 'professional product photo of a modern 5G smartphone with gradient blue back cover, studio lighting, clean white background' },
  { m: 'merchant_digital', cat: '手机数码', name: '声动 Air 主动降噪蓝牙耳机', price: 599, stock: 500, img: 'professional product photo of white wireless noise cancelling earbuds in charging case, studio lighting, white background' },
  { m: 'merchant_digital', cat: '手机数码', name: '智控 Fit 智能运动手表', price: 899, stock: 300, img: 'professional product photo of a modern smartwatch with silicone strap, dark background, studio lighting' },
  { m: 'merchant_digital', cat: '电脑办公', name: '轻薄本 Air 14 英寸 16G+512G', price: 5299, stock: 120, img: 'professional product photo of a slim silver laptop open on white desk, studio lighting' },
  { m: 'merchant_digital', cat: '电脑办公', name: '机械键盘 87 键 茶轴 白色', price: 329, stock: 400, img: 'professional product photo of a white mechanical keyboard with backlit keys, top view, white background' },
  { m: 'merchant_digital', cat: '电脑办公', name: '4K 高清摄像头 直播专用', price: 459, stock: 260, img: 'professional product photo of a black 4K webcam on white background, studio lighting' },
  // 品质家居
  { m: 'merchant_home', cat: '家居百货', name: '北欧简约布艺沙发三人位', price: 2699, stock: 60, img: 'professional product photo of a modern beige fabric three seat sofa in a bright living room' },
  { m: 'merchant_home', cat: '家居百货', name: '全棉四件套 1.8m 床品', price: 399, stock: 350, img: 'professional product photo of folded cotton bedding set on white bed, warm natural light' },
  { m: 'merchant_home', cat: '家居百货', name: '落地收纳置物架 五层', price: 189, stock: 420, img: 'professional product photo of a five tier wooden storage shelf in a clean room' },
  { m: 'merchant_home', cat: '家用电器', name: '智能扫地机器人 扫拖一体', price: 1799, stock: 150, img: 'professional product photo of a white robot vacuum cleaner on wooden floor, studio lighting' },
  { m: 'merchant_home', cat: '家用电器', name: '大容量空气炸锅 5.5L', price: 499, stock: 280, img: 'professional product photo of a black air fryer on kitchen counter, studio lighting' },
  { m: 'merchant_home', cat: '家用电器', name: '静音加湿器 卧室适用', price: 159, stock: 380, img: 'professional product photo of a minimalist white humidifier with mist, soft lighting' },
  // 美妆护肤
  { m: 'merchant_beauty', cat: '美妆护肤', name: '氨基酸温和洁面乳 100g', price: 89, stock: 600, img: 'professional product photo of a white facial cleanser tube with minimal design, white background' },
  { m: 'merchant_beauty', cat: '美妆护肤', name: '烟酰胺精华液 30ml 提亮肤色', price: 239, stock: 450, img: 'professional product photo of a glass dropper serum bottle, clean white background' },
  { m: 'merchant_beauty', cat: '美妆护肤', name: '丝绒雾面口红 正红色', price: 129, stock: 520, img: 'professional product photo of a red lipstick with gold tube, elegant white background' },
  { m: 'merchant_beauty', cat: '美妆护肤', name: '深层补水保湿面膜 10 片装', price: 99, stock: 700, img: 'professional product photo of a stack of skincare facial sheet masks, white background' },
  { m: 'merchant_beauty', cat: '美妆护肤', name: '控油蓬松洗发水 500ml', price: 79, stock: 640, img: 'professional product photo of a shampoo bottle with green minimal design, white background' },
  { m: 'merchant_beauty', cat: '美妆护肤', name: '防晒霜 SPF50+ 清爽不油腻', price: 149, stock: 480, img: 'professional product photo of a sunscreen tube on white background, studio lighting' },
  // 食光零食
  { m: 'merchant_food', cat: '食品生鲜', name: '每日坚果混合装 30 包', price: 69, stock: 800, img: 'professional food photo of assorted nuts and dried fruits in small packs, white background' },
  { m: 'merchant_food', cat: '食品生鲜', name: '手撕面包整箱早餐 1kg', price: 39, stock: 900, img: 'professional food photo of shredded bread loaf on wooden board, warm light' },
  { m: 'merchant_food', cat: '食品生鲜', name: '冷萃精品挂耳咖啡 20 杯', price: 89, stock: 560, img: 'professional food photo of drip coffee bags with coffee beans, warm background' },
  { m: 'merchant_food', cat: '食品生鲜', name: '无糖气泡水 0 卡 12 瓶装', price: 49, stock: 750, img: 'professional beverage photo of sparkling water bottles with lemon slices, white background' },
  { m: 'merchant_food', cat: '食品生鲜', name: '冻干水果干混合装 500g', price: 59, stock: 620, img: 'professional food photo of freeze dried fruit pieces in a bowl, white background' },
  { m: 'merchant_food', cat: '食品生鲜', name: '低脂鸡胸肉即食 10 袋', price: 79, stock: 680, img: 'professional food photo of vacuum packed cooked chicken breast, white background' }
];

const REVIEW_TEXTS = [
  { rating: 5, content: '商品质量很好，包装严实，物流也很快，非常满意！' },
  { rating: 5, content: '和描述一致，做工精细，性价比很高，推荐购买。' },
  { rating: 5, content: '用了一周了，体验不错，客服态度也很好，五星好评。' },
  { rating: 4, content: '整体不错，就是发货稍微慢了一天，其他都挺好。' },
  { rating: 4, content: '东西挺好的，价格再优惠一点就更完美了。' },
  { rating: 3, content: '一般般吧，功能正常，但是包装有点简陋。' },
  { rating: 2, content: '收到时外包装有破损，商品有轻微划痕，申请了售后。' },
  { rating: 1, content: '和图片差距有点大，做工粗糙，比较失望。' },
  { rating: 5, content: '回购第二次了，一如既往的好，家里人都很喜欢。' },
  { rating: 4, content: '材质摸起来很舒服，尺寸也合适，物流速度快。' }
];

const AFTER_SALE_REASONS = [
  '商品与描述不符，颜色有明显色差，申请退款。',
  '收到商品有质量问题，外壳有磕碰，希望退货退款。',
  '多拍了一件，商家还未发货，申请仅退款。',
  '尺寸不合适，想换成小一号，申请退货退款。',
  '物流太慢，已经不需要了，申请仅退款。'
];

const AI_LOG_SAMPLES = [
  { scene: 'recommend', input: '浏览6条/收藏2条/购买1条', output: '声动 Air 主动降噪蓝牙耳机：与你收藏的数码好物风格一致；智控 Fit 智能运动手表：适合运动场景' },
  { scene: 'chat', input: '推荐一款适合通勤的降噪耳机，预算 600 以内', output: '通勤路上最需要安静～推荐给你：声动 Air 主动降噪蓝牙耳机｜¥599｜主动降噪+30小时续航，通勤党首选。' },
  { scene: 'product-copy', input: '商品：简约落地置物架；分类：家居百货；特点：实木、五层、承重强', output: '标题：实木五层落地置物架 客厅收纳好帮手\n卖点：实木材质、五层大容量、稳固承重\n描述：采用实木打造，五层大容量设计，轻松收纳各类物品……' },
  { scene: 'review-analysis', input: '分析范围：商品ID 2；评价共 12 条，平均 4.3 分', output: '总结：整体口碑良好，用户普遍认可音质与续航\n正面：音质清晰、降噪效果好、续航持久\n负面：耳塞偏硬、充电盒易刮花\n关注点：音质、续航、佩戴舒适度' },
  { scene: 'chat', input: '有什么适合送女朋友的礼物？', output: '送女友可以看看：丝绒雾面口红｜¥129｜正红色显白，节日送礼很合适；烟酰胺精华液｜¥239｜提亮肤色，日常护肤好物。' },
  { scene: 'recommend', input: '浏览8条/收藏3条/购买2条', output: '每日坚果混合装 30 包：健康零食复购率高；冷萃精品挂耳咖啡 20 杯：与你的咖啡偏好匹配' },
  { scene: 'product-copy', input: '商品：无糖气泡水；分类：食品生鲜；特点：0糖0卡、青柠味、12瓶', output: '标题：0 糖 0 卡青柠气泡水 整箱 12 瓶\n卖点：0糖0卡、清爽解腻、便携整箱\n描述：精选青柠风味，0 糖 0 卡无负担……' },
  { scene: 'review-analysis', input: '分析范围：本店全部商品；评价共 26 条，平均 4.1 分', output: '总结：好评集中在性价比与物流速度，差评多与包装有关\n负面：外包装简陋、个别商品有色差\n关注点：性价比、物流、包装' }
];

/* ------------------------- 主流程 ------------------------- */
const run = async () => {
  await sequelize.authenticate();

  // 幂等保护
  const existingProducts = await Product.count();
  if (existingProducts > 0 && !RESET) {
    console.log(`检测到已有 ${existingProducts} 个商品，未执行写入。如需重建请运行：node scripts/seed.js --reset`);
    process.exit(0);
  }

  if (RESET) {
    console.log('开始清空业务数据 ...');
    await AiLog.destroy({ where: {} });
    await Address.destroy({ where: {} });
    await BrowseHistory.destroy({ where: {} });
    await Favorite.destroy({ where: {} });
    await Cart.destroy({ where: {} });
    await Review.destroy({ where: {} });
    await AfterSale.destroy({ where: {} });
    await Order.destroy({ where: {} });
    await Product.destroy({ where: {} });
    await Shop.destroy({ where: {} });
    await Category.destroy({ where: {} });
    await User.destroy({ where: { username: { [Op.or]: [{ [Op.like]: 'buyer_%' }, { [Op.like]: 'merchant_%' }] } } });
    console.log('业务数据已清空');
  }

  /* 1. 分类 */
  const categories = {};
  for (const c of CATEGORIES) {
    const row = await Category.create({ ...c, status: 'active' });
    categories[c.name] = row;
  }
  console.log(`分类：${Object.keys(categories).length} 个`);

  /* 2. 商家账号 + 店铺 */
  const merchantUsers = {};
  for (let mi = 0; mi < MERCHANTS.length; mi++) {
    const m = MERCHANTS[mi];
    const user = await User.create({
      username: m.username,
      email: `${m.username}@mall.com`,
      password: PASSWORD,
      nickname: m.nickname,
      phone: m.shop.contact_phone,
      role: m.shop.status === 'approved' ? 'merchant' : 'user',
      status: 'active',
      created_at: daysAgo(30)
    });
    await Shop.create({
      user_id: user.id,
      shop_name: m.shop.shop_name,
      logo: localOr('shopImages', mi, img(`${m.shop.shop_name} brand logo, minimal flat design, orange theme`, 'square')),
      description: m.shop.description,
      business_category: m.shop.business_category,
      contact_name: m.shop.contact_name,
      contact_phone: m.shop.contact_phone,
      business_license: m.shop.business_license,
      license_image: localOr('licenseImages', mi, img('business license certificate document scan, clean white background', 'landscape_4_3')),
      address: m.shop.address,
      status: m.shop.status,
      reject_reason: m.shop.reject_reason || null,
      created_at: daysAgo(20)
    });
    merchantUsers[m.username] = user;
  }
  console.log(`商家账号：${MERCHANTS.length} 个（其中 1 待审核 / 1 已拒绝）`);

  /* 3. 买家账号 */
  const buyers = [];
  for (let i = 0; i < BUYERS.length; i++) {
    const b = BUYERS[i];
    const user = await User.create({
      username: b.username,
      email: `${b.username}@mall.com`,
      password: PASSWORD,
      nickname: b.nickname,
      phone: b.phone,
      role: 'user',
      status: 'active',
      id_verified: i % 2 === 0,
      real_name: i % 2 === 0 ? b.nickname : null,
      id_card: i % 2 === 0 ? `31010119900101${String(1000 + i).padStart(4, '0')}` : null,
      created_at: daysAgo(25)
    });
    buyers.push({ ...b, id: user.id });
  }
  console.log(`买家账号：${buyers.length} 个`);

  /* 3.1 买家收货地址簿（默认地址，结算时自动带入） */
  for (const buyer of buyers) {
    await Address.create({
      user_id: buyer.id,
      receiver_name: buyer.nickname,
      receiver_phone: buyer.phone,
      region: buyer.region,
      detail_address: buyer.detail,
      tag: '家',
      is_default: true,
      created_at: daysAgo(20)
    });
  }
  console.log(`收货地址：${buyers.length} 条（每位买家 1 条默认地址）`);

  /* 4. 商品（全部审核通过并上架） */
  const products = [];
  for (let pi = 0; pi < PRODUCTS.length; pi++) {
    const p = PRODUCTS[pi];
    const product = await Product.create({
      name: p.name,
      image: localOr('productImages', pi, img(p.img)),
      description: `${p.name}。\n\n【产品亮点】\n· 品质优选，做工精细，细节处理到位\n· 贴心设计，日常使用更省心\n· 售后无忧，支持 7 天无理由退换\n\n【适用场景】\n居家、通勤、办公、送礼皆宜。\n\n【温馨提示】\n商品图片仅供参考，请以实物为准。`,
      stock: p.stock,
      sales: 0,
      price: p.price,
      status: 'active',
      audit_status: 'approved',
      category_id: categories[p.cat].id,
      user_id: merchantUsers[p.m].id,
      created_at: daysAgo(15)
    });
    products.push(product);
  }
  console.log(`商品：${products.length} 个`);

  /* 5. 订单（覆盖 5 种状态） */
  const statusPlan = ['completed', 'completed', 'completed', 'completed', 'completed', 'shipped', 'paid', 'pending', 'cancelled'];
  const orders = [];
  let orderSeq = 1;
  for (const buyer of buyers) {
    const chosen = pickMany(products, 7);
    for (const product of chosen) {
      const status = pick(statusPlan);
      const quantity = rand(1, 3);
      const createdAt = daysAgo(14);
      const orderNo = `ORD${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, '0')}${String(createdAt.getDate()).padStart(2, '0')}${String(orderSeq++).padStart(4, '0')}`;
      const order = await Order.create({
        order_no: orderNo,
        user_id: buyer.id,
        product_id: product.id,
        quantity,
        total_price: Number((Number(product.price) * quantity).toFixed(2)),
        status,
        receiver_name: buyer.nickname,
        receiver_phone: buyer.phone,
        receiver_address: buyer.address,
        remark: Math.random() > 0.7 ? '请尽快发货，谢谢！' : null,
        created_at: createdAt
      });
      orders.push(order);
    }
  }
  console.log(`订单：${orders.length} 个（覆盖待支付/待发货/待收货/已完成/已取消）`);

  /* 6. 评价（仅针对已完成订单，一单一评） */
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const reviewOrders = completedOrders.slice(0, 14);
  let reviewCount = 0;
  for (const order of reviewOrders) {
    const tpl = pick(REVIEW_TEXTS);
    await Review.create({
      user_id: order.user_id,
      product_id: order.product_id,
      order_id: order.id,
      rating: tpl.rating,
      content: tpl.content,
      created_at: new Date(new Date(order.created_at).getTime() + rand(1, 5) * 24 * 3600 * 1000)
    });
    reviewCount++;
  }
  console.log(`商品评价：${reviewCount} 条（含好评/中评/差评）`);

  /* 7. 售后申请（含异常：已拒绝 + 超时未处理） */
  const reviewedOrderIds = reviewOrders.map((o) => o.id);
  const afterSaleTargets = orders
    .filter((o) => ['paid', 'shipped', 'completed'].includes(o.status) && !reviewedOrderIds.includes(o.id))
    .slice(0, 7);
  const afterSalePlan = ['pending', 'pending', 'approved', 'rejected', 'completed', 'completed', 'rejected'];
  let afterSaleCount = 0;
  for (let i = 0; i < afterSaleTargets.length; i++) {
    const order = afterSaleTargets[i];
    const status = afterSalePlan[i] || 'pending';
    const type = order.status === 'paid' ? 'refund' : pick(['refund', 'return']);
    const createdAt = status === 'pending' && i === 1
      ? new Date(Date.now() - 6 * 24 * 3600 * 1000) // 制造一条超时未处理的异常售后
      : daysAgo(8);
    await AfterSale.create({
      order_id: order.id,
      user_id: order.user_id,
      type,
      reason: pick(AFTER_SALE_REASONS),
      status,
      handle_remark: ['approved', 'rejected', 'completed'].includes(status)
        ? status === 'rejected' ? '商品已使用且无明显质量问题，暂不支持退款。' : '已审核通过，退款将原路返回。'
        : null,
      created_at: createdAt
    });
    // 售后完成：订单置为已取消（与后端处理逻辑一致）
    if (status === 'completed') await order.update({ status: 'cancelled' });
    afterSaleCount++;
  }
  console.log(`售后申请：${afterSaleCount} 条（含 2 条异常：已拒绝 / 超时未处理）`);

  /* 8. 重新统计商品库存与销量（已取消订单不占用库存） */
  for (const product of products) {
    const validOrders = await Order.findAll({
      where: { product_id: product.id, status: { [Op.ne]: 'cancelled' } }
    });
    const sold = validOrders.reduce((sum, o) => sum + o.quantity, 0);
    const baseStock = PRODUCTS.find((p) => p.name === product.name).stock;
    await product.update({ sales: sold, stock: Math.max(baseStock - sold, 0) });
  }
  console.log('商品库存与销量已按订单重新统计');

  /* 9. 收藏 / 购物车 / 浏览足迹（为 AI 推荐提供行为数据） */
  let favCount = 0;
  let cartCount = 0;
  let browseCount = 0;
  for (const buyer of buyers) {
    // 收藏
    for (const product of pickMany(products, 4)) {
      await Favorite.create({ user_id: buyer.id, product_id: product.id, created_at: daysAgo(10) });
      favCount++;
    }
    // 购物车
    for (const product of pickMany(products, 3)) {
      if (Number(product.stock) <= 0) continue;
      await Cart.create({ user_id: buyer.id, product_id: product.id, quantity: rand(1, 2), created_at: daysAgo(3) });
      cartCount++;
    }
    // 浏览足迹（AI 个性化推荐依赖此数据）
    for (const product of pickMany(products, 8)) {
      await BrowseHistory.create({ user_id: buyer.id, product_id: product.id, created_at: daysAgo(7) });
      browseCount++;
    }
  }
  console.log(`收藏：${favCount} 条；购物车：${cartCount} 条；浏览足迹：${browseCount} 条`);

  /* 10. AI 调用记录 & 生成内容 */
  let aiLogCount = 0;
  for (const sample of AI_LOG_SAMPLES) {
    await AiLog.create({
      user_id: pick(buyers).id,
      scene: sample.scene,
      scene_name: { recommend: 'AI个性化推荐', chat: 'AI导购对话', 'product-copy': 'AI商品文案生成', 'review-analysis': 'AI评价分析' }[sample.scene],
      input: sample.input,
      output: sample.output,
      status: 'success',
      duration_ms: rand(600, 4200),
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      created_at: daysAgo(6)
    });
    aiLogCount++;
  }
  // 追加少量失败记录，便于管理端查看异常
  for (let i = 0; i < 2; i++) {
    await AiLog.create({
      user_id: pick(buyers).id,
      scene: 'chat',
      scene_name: 'AI导购对话',
      input: pick(['帮我推荐一款洗面奶', '有没有适合健身的装备？']),
      output: null,
      status: 'failed',
      error_message: 'DeepSeek接口错误 429: rate limit exceeded',
      duration_ms: rand(200, 900),
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      created_at: daysAgo(4)
    });
    aiLogCount++;
  }
  console.log(`AI 调用记录：${aiLogCount} 条`);

  /* ------------------------- 汇总 ------------------------- */
  const summary = {
    分类: await Category.count(),
    商家账号: await User.count({ where: { role: 'merchant' } }),
    待审核店铺: await Shop.count({ where: { status: 'pending' } }),
    被拒店铺: await Shop.count({ where: { status: 'rejected' } }),
    买家账号: await User.count({ where: { role: 'user' } }),
    商品: await Product.count(),
    订单: await Order.count(),
    评价: await Review.count(),
    售后: await AfterSale.count(),
    收藏: await Favorite.count(),
    购物车: await Cart.count(),
    浏览足迹: await BrowseHistory.count(),
    AI日志: await AiLog.count()
  };
  console.log('\n===== 数据生成完成 =====');
  console.table(summary);
  console.log('\n登录账号（密码统一为 123456）：');
  console.log('  管理员端  : admin             (已有账号，密码 admin123456)');
  console.log('  商家端    : merchant_digital / merchant_home / merchant_beauty / merchant_food');
  console.log('  商家端(待审核) : merchant_fashion     (用于测试入驻审核)');
  console.log('  商家端(已拒绝) : merchant_old         (用于测试重新提交)');
  console.log('  用户端    : buyer_lin / buyer_chen / buyer_zhao / buyer_sun');

  process.exit(0);
};

run().catch(async (err) => {
  console.error('生成测试数据失败:', err);
  await sequelize.close();
  process.exit(1);
});
