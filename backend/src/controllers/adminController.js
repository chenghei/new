/**
 * 平台管理控制器（adminController）—— 管理员端新增
 * ------------------------------------------------------------------
 * 支撑管理端以下功能，所有接口均要求管理员权限（路由层挂 requireAdmin）：
 *   用户与商家管理：getMerchants / setMerchantStatus
 *   售后监管：getAfterSales（含异常售后筛选）
 *   平台数据统计：getStats / getSalesTrend / getUserGrowthTrend
 *               / getOrderStatusDistribution / getCategoryDistribution
 *               / getRecentOrders
 *
 * 说明：数据统计统一以平台全量数据为口径（不区分商家）。
 */
const { Op, fn, col } = require('sequelize');
const User = require('../models/User');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Review = require('../models/Review');
const AfterSale = require('../models/AfterSale');
const { success, error, notFound } = require('../utils/response');

/* ============================ 商家管理 ============================ */

// 商家列表（含店铺与资质信息）
exports.getMerchants = async (req, res) => {
  try {
    const { page = 1, limit = 10, keyword, status, shop_status } = req.query;
    const offset = (page - 1) * limit;

    const where = { role: 'merchant' };
    if (status) where.status = status;
    if (keyword) {
      where[Op.or] = [
        { username: { [Op.like]: `%${keyword}%` } },
        { nickname: { [Op.like]: `%${keyword}%` } },
        { email: { [Op.like]: `%${keyword}%` } }
      ];
    }

    const shopInclude = { model: Shop, as: 'shop' };
    if (shop_status) {
      shopInclude.where = { status: shop_status };
      shopInclude.required = true;
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [shopInclude],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const [total, approved, pending, rejected, disabled] = await Promise.all([
      User.count({ where: { role: 'merchant' } }),
      Shop.count({ where: { status: 'approved' } }),
      Shop.count({ where: { status: 'pending' } }),
      Shop.count({ where: { status: 'rejected' } }),
      User.count({ where: { role: 'merchant', status: 'inactive' } })
    ]);

    return success(
      res,
      {
        merchants: rows,
        stats: { total, approved, pending, rejected, disabled },
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      },
      '获取商家列表成功'
    );
  } catch (err) {
    console.error('获取商家列表失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 启用/禁用商家账号
exports.setMerchantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return error(res, '状态值不合法', 400);
    }

    const user = await User.findByPk(id);
    if (!user) return notFound(res, '商家不存在');
    if (user.role !== 'merchant') {
      return error(res, '该账号不是商家', 400);
    }

    await user.update({ status });
    return success(res, user.toSafeJSON(), status === 'active' ? '商家账号已启用' : '商家账号已禁用');
  } catch (err) {
    console.error('更新商家状态失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

/* ============================ 售后监管 ============================ */

// 平台售后列表（支持异常售后筛选）
exports.getAfterSales = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, abnormal, keyword } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    // 异常售后：被拒绝的申请，或超过 3 天仍待处理的申请
    if (abnormal === '1' || abnormal === true) {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      where[Op.or] = [
        { status: 'rejected' },
        { status: 'pending', created_at: { [Op.lt]: threeDaysAgo } }
      ];
    }

    const orderInclude = {
      model: Order,
      as: 'order',
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'image', 'price', 'user_id'] },
        { model: User, as: 'user', attributes: ['id', 'username', 'nickname'] }
      ]
    };
    if (keyword) {
      orderInclude.where = { order_no: { [Op.like]: `%${keyword}%` } };
      orderInclude.required = true;
    }

    const { count, rows } = await AfterSale.findAndCountAll({
      where,
      include: [orderInclude, { model: User, as: 'user', attributes: ['id', 'username', 'nickname'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const [total, pending, rejected, completed, abnormalCount] = await Promise.all([
      AfterSale.count(),
      AfterSale.count({ where: { status: 'pending' } }),
      AfterSale.count({ where: { status: 'rejected' } }),
      AfterSale.count({ where: { status: 'completed' } }),
      AfterSale.count({
        where: {
          [Op.or]: [
            { status: 'rejected' },
            { status: 'pending', created_at: { [Op.lt]: threeDaysAgo } }
          ]
        }
      })
    ]);

    return success(
      res,
      {
        afterSales: rows,
        stats: { total, pending, rejected, completed, abnormalCount },
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      },
      '获取售后列表成功'
    );
  } catch (err) {
    console.error('获取平台售后列表失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

/* ============================ 平台数据统计 ============================ */

// 平台数据概览
exports.getStats = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const tomorrow = new Date(startOfToday);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const validStatus = ['paid', 'shipped', 'completed'];

    const [
      totalUsers,
      totalMerchants,
      totalProducts,
      pendingProductAudit,
      pendingShopAudit,
      totalOrders,
      pendingOrders,
      totalReviews,
      pendingAfterSales,
      todayUsers,
      todayOrders
    ] = await Promise.all([
      User.count({ where: { role: 'user' } }),
      User.count({ where: { role: 'merchant' } }),
      Product.count(),
      Product.count({ where: { audit_status: 'pending' } }),
      Shop.count({ where: { status: 'pending' } }),
      Order.count(),
      Order.count({ where: { status: 'paid' } }),
      Review.count(),
      AfterSale.count({ where: { status: 'pending' } }),
      User.count({ where: { created_at: { [Op.gte]: startOfToday, [Op.lt]: tomorrow } } }),
      Order.count({ where: { created_at: { [Op.gte]: startOfToday, [Op.lt]: tomorrow } } })
    ]);

    const totalSalesRow = await Order.findOne({
      attributes: [[fn('SUM', col('total_price')), 'sum']],
      where: { status: { [Op.in]: validStatus } },
      raw: true
    });
    const todaySalesRow = await Order.findOne({
      attributes: [[fn('SUM', col('total_price')), 'sum']],
      where: {
        status: { [Op.in]: validStatus },
        created_at: { [Op.gte]: startOfToday, [Op.lt]: tomorrow }
      },
      raw: true
    });
    const avgRatingRow = await Review.findOne({
      attributes: [[fn('AVG', col('rating')), 'avg']],
      raw: true
    });

    return success(
      res,
      {
        totalUsers,
        totalMerchants,
        totalProducts,
        pendingProductAudit,
        pendingShopAudit,
        totalOrders,
        pendingOrders,
        totalReviews,
        pendingAfterSales,
        todayUsers,
        todayOrders,
        totalSales: Number(totalSalesRow?.sum || 0),
        todaySales: Number(todaySalesRow?.sum || 0),
        avgRating: Number(Number(avgRatingRow?.avg || 0).toFixed(1))
      },
      '获取平台统计成功'
    );
  } catch (err) {
    console.error('获取平台统计失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 近 N 天销售趋势
exports.getSalesTrend = async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 30);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const orders = await Order.findAll({
      where: { created_at: { [Op.gte]: start } },
      attributes: ['id', 'total_price', 'status', 'created_at']
    });

    const labels = [];
    const map = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`;
      labels.push(key);
      map[key] = { orders: 0, sales: 0 };
    }

    orders.forEach((o) => {
      const d = new Date(o.created_at);
      const key = `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) return;
      map[key].orders += 1;
      if (o.status !== 'cancelled') map[key].sales += Number(o.total_price || 0);
    });

    return success(
      res,
      {
        labels,
        orders: labels.map((k) => map[k].orders),
        sales: labels.map((k) => Number(map[k].sales.toFixed(2)))
      },
      '获取销售趋势成功'
    );
  } catch (err) {
    console.error('获取销售趋势失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 近 N 天新增用户趋势
exports.getUserGrowthTrend = async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 30);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const users = await User.findAll({
      where: { created_at: { [Op.gte]: start } },
      attributes: ['id', 'role', 'created_at']
    });

    const labels = [];
    const map = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`;
      labels.push(key);
      map[key] = { users: 0, merchants: 0 };
    }

    users.forEach((u) => {
      const d = new Date(u.created_at);
      const key = `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) return;
      if (u.role === 'merchant') map[key].merchants += 1;
      else map[key].users += 1;
    });

    return success(
      res,
      {
        labels,
        users: labels.map((k) => map[k].users),
        merchants: labels.map((k) => map[k].merchants)
      },
      '获取用户增长趋势成功'
    );
  } catch (err) {
    console.error('获取用户增长趋势失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 订单状态分布
exports.getOrderStatusDistribution = async (req, res) => {
  try {
    const statuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
    const result = await Promise.all(
      statuses.map(async (status) => ({ status, count: await Order.count({ where: { status } }) }))
    );
    return success(res, result, '获取订单状态分布成功');
  } catch (err) {
    console.error('获取订单状态分布失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 商品分类分布（各分类商品数量 TOP8）
exports.getCategoryDistribution = async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: ['id', 'name'],
      include: [{ model: Product, as: 'products', attributes: ['id'] }]
    });

    const result = categories
      .map((c) => ({ id: c.id, name: c.name, count: (c.products || []).length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return success(res, result, '获取分类分布成功');
  } catch (err) {
    console.error('获取分类分布失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 最近订单
exports.getRecentOrders = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const orders = await Order.findAll({
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'image', 'price', 'user_id'],
          include: [{ model: User, as: 'merchant', attributes: ['id', 'username', 'nickname'] }]
        },
        { model: User, as: 'user', attributes: ['id', 'username', 'nickname'] }
      ],
      order: [['created_at', 'DESC']],
      limit
    });
    return success(res, orders, '获取最近订单成功');
  } catch (err) {
    console.error('获取最近订单失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};
