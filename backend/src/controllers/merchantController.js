/**
 * 商家端控制器（merchantController）—— 本次新增
 * ------------------------------------------------------------------
 * 为商家后台提供以下能力：
 *   店铺管理：getMyShop / applyShop / updateShop
 *     - 入驻申请、资质信息提交、审核状态查询、店铺基本信息维护
 *   数据统计：getStats / getSalesTrend / getOrderStatusDistribution
 *             / getReviewRatingDistribution / getTopProducts
 *   评论管理：getReviews（商家名下商品的用户评价列表）
 *   售后管理：getAfterSales（商家名下商品相关的用户售后申请）
 *
 * 说明：所有接口均以 req.user.id 作为“本商家”身份，
 *       统计与查询范围自动限定为该商家发布的商品及其订单，
 *       避免越权查看其他商家数据。
 */
const { Op, fn, col } = require('sequelize');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const AfterSale = require('../models/AfterSale');
const User = require('../models/User');
const Category = require('../models/Category');
const { success, error, notFound } = require('../utils/response');

// 获取本商家发布的所有商品 ID
const getMerchantProductIds = async (userId) => {
  const products = await Product.findAll({
    where: { user_id: userId },
    attributes: ['id']
  });
  return products.map((p) => p.id);
};

// 获取本商家商品相关的订单
const getMerchantOrders = async (productIds, extraWhere = {}) => {
  if (!productIds.length) return [];
  return Order.findAll({
    where: { product_id: { [Op.in]: productIds }, ...extraWhere }
  });
};

// 解析经营类目：以 category_id（管理员维护的分类）为准，并同步分类名称到 business_category
const resolveBusinessCategory = async (categoryId) => {
  const id = Number(categoryId);
  if (!id) return null;
  const category = await Category.findByPk(id);
  if (!category) return null;
  return { category_id: category.id, business_category: category.name };
};

/* ============================ 店铺管理 ============================ */

// 获取我的店铺信息（含审核状态）
exports.getMyShop = async (req, res) => {
  try {
    const shop = await Shop.findOne({ where: { user_id: req.user.id } });
    return success(res, shop, shop ? '获取店铺信息成功' : '尚未提交入驻申请');
  } catch (err) {
    console.error('获取店铺信息失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 公开接口：已通过审核的店铺列表（含在售商品数），供用户端「按商家找商品」使用
exports.getPublicShops = async (req, res) => {
  try {
    const { keyword } = req.query;

    const where = { status: 'approved' };
    if (keyword) {
      where.shop_name = { [Op.like]: `%${keyword}%` };
    }

    const shops = await Shop.findAll({
      where,
      order: [['created_at', 'ASC']]
    });

    // 统计各店铺在售（已上架且审核通过）的商品数量
    const userIds = shops.map((s) => s.user_id);
    const countMap = {};
    if (userIds.length) {
      const rows = await Product.findAll({
        where: {
          user_id: { [Op.in]: userIds },
          status: 'active',
          audit_status: 'approved'
        },
        attributes: ['user_id', [fn('COUNT', col('id')), 'count']],
        group: ['user_id'],
        raw: true
      });
      rows.forEach((row) => {
        countMap[row.user_id] = Number(row.count);
      });
    }

    const data = shops.map((shop) => ({
      id: shop.id,
      user_id: shop.user_id,
      shop_name: shop.shop_name,
      logo: shop.logo,
      business_category: shop.business_category,
      category_id: shop.category_id,
      description: shop.description,
      product_count: countMap[shop.user_id] || 0
    }));

    return success(res, { shops: data }, '获取商家列表成功');
  } catch (err) {
    console.error('获取商家列表失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 提交入驻申请（含资质信息）
exports.applyShop = async (req, res) => {
  try {
    const existing = await Shop.findOne({ where: { user_id: req.user.id } });
    if (existing) {
      if (existing.status === 'approved') {
        return error(res, '店铺已通过审核，无需重复申请', 400);
      }
      if (existing.status === 'pending') {
        return error(res, '入驻申请正在审核中，请耐心等待', 400);
      }
      return error(res, '申请曾被拒绝，请修改资料后重新提交', 400);
    }

    const {
      shop_name,
      logo,
      description,
      category_id,
      contact_name,
      contact_phone,
      business_license,
      license_image,
      address
    } = req.body;

    if (!shop_name) {
      return error(res, '店铺名称不能为空', 400);
    }

    // 经营类目为必填：必须从管理员维护的分类中选择
    if (category_id === undefined || category_id === null || category_id === '') {
      return error(res, '请选择经营类目', 400);
    }
    const categoryFields = await resolveBusinessCategory(category_id);
    if (!categoryFields) {
      return error(res, '所选经营类目不存在，请重新选择', 400);
    }

    const shop = await Shop.create({
      user_id: req.user.id,
      shop_name,
      logo,
      description,
      ...categoryFields,
      contact_name,
      contact_phone,
      business_license,
      license_image,
      address,
      status: 'pending'
    });

    return success(res, shop, '入驻申请已提交，请等待审核', 201);
  } catch (err) {
    console.error('提交入驻申请失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 维护店铺基本信息（审核被拒时提交会自动重新进入待审核）
exports.updateShop = async (req, res) => {
  try {
    const shop = await Shop.findOne({ where: { user_id: req.user.id } });
    if (!shop) {
      return notFound(res, '店铺不存在，请先提交入驻申请');
    }

    const {
      shop_name,
      logo,
      description,
      category_id,
      contact_name,
      contact_phone,
      business_license,
      license_image,
      address
    } = req.body;

    const updateData = {};
    if (shop_name !== undefined) updateData.shop_name = shop_name;
    if (logo !== undefined) updateData.logo = logo;
    if (description !== undefined) updateData.description = description;
    // 经营类目在入驻时确定：审核通过/审核中不可修改，仅被拒绝重新提交时可调整
    if (shop.status === 'rejected' && category_id !== undefined) {
      if (category_id === null || category_id === '') {
        return error(res, '请选择经营类目', 400);
      }
      const resolved = await resolveBusinessCategory(category_id);
      if (!resolved) {
        return error(res, '所选经营类目不存在，请重新选择', 400);
      }
      Object.assign(updateData, resolved);
    }
    if (contact_name !== undefined) updateData.contact_name = contact_name;
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone;
    if (business_license !== undefined) updateData.business_license = business_license;
    if (license_image !== undefined) updateData.license_image = license_image;
    if (address !== undefined) updateData.address = address;

    // 被拒绝的申请，修改资料后重新提交审核
    if (shop.status === 'rejected') {
      updateData.status = 'pending';
      updateData.reject_reason = null;
    }

    await shop.update(updateData);
    return success(res, shop, shop.status === 'pending' ? '资料已更新，等待审核' : '店铺信息已更新');
  } catch (err) {
    console.error('更新店铺信息失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

/* ============================ 数据统计 ============================ */

// 店铺运营概览
exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const productIds = await getMerchantProductIds(userId);

    const products = await Product.findAll({
      where: { user_id: userId },
      attributes: ['id', 'status', 'audit_status', 'sales', 'stock']
    });

    const orders = await getMerchantOrders(productIds);
    const validOrders = orders.filter((o) => o.status !== 'cancelled');

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const salesAmount = validOrders
      .filter((o) => ['paid', 'shipped', 'completed'].includes(o.status))
      .reduce((sum, o) => sum + Number(o.total_price || 0), 0);

    const todayOrders = orders.filter((o) => new Date(o.created_at) >= startOfToday);
    const todaySales = todayOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total_price || 0), 0);

    const salesQuantity = validOrders.reduce((sum, o) => sum + Number(o.quantity || 0), 0);

    const reviewWhere = productIds.length ? { product_id: { [Op.in]: productIds } } : null;
    const reviews = reviewWhere ? await Review.findAll({ where: reviewWhere, attributes: ['rating'] }) : [];
    const avgRating = reviews.length
      ? Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1))
      : 0;

    const orderIds = orders.map((o) => o.id);
    const pendingAfterSales = orderIds.length
      ? await AfterSale.count({ where: { order_id: { [Op.in]: orderIds }, status: 'pending' } })
      : 0;

    return success(
      res,
      {
        productCount: products.length,
        activeProductCount: products.filter((p) => p.status === 'active' && p.audit_status === 'approved').length,
        pendingAuditCount: products.filter((p) => p.audit_status === 'pending').length,
        offShelfCount: products.filter((p) => p.status === 'inactive').length,
        lowStockCount: products.filter((p) => p.stock <= 5).length,
        orderCount: orders.length,
        pendingShipCount: orders.filter((o) => o.status === 'paid').length,
        completedOrderCount: orders.filter((o) => o.status === 'completed').length,
        salesAmount: Number(salesAmount.toFixed(2)),
        salesQuantity,
        todayOrderCount: todayOrders.length,
        todaySales: Number(todaySales.toFixed(2)),
        reviewCount: reviews.length,
        avgRating,
        pendingAfterSaleCount: pendingAfterSales
      },
      '获取统计概览成功'
    );
  } catch (err) {
    console.error('获取统计概览失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 近 N 天销售趋势
exports.getSalesTrend = async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 30);
    const productIds = await getMerchantProductIds(req.user.id);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const orders = await getMerchantOrders(productIds, { created_at: { [Op.gte]: start } });

    // 构造日期序列
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

// 订单状态分布
exports.getOrderStatusDistribution = async (req, res) => {
  try {
    const productIds = await getMerchantProductIds(req.user.id);
    const orders = await getMerchantOrders(productIds);

    const statuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
    const result = statuses.map((status) => ({
      status,
      count: orders.filter((o) => o.status === status).length
    }));

    return success(res, result, '获取订单状态分布成功');
  } catch (err) {
    console.error('获取订单状态分布失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 商品评价星级分布
exports.getReviewRatingDistribution = async (req, res) => {
  try {
    const productIds = await getMerchantProductIds(req.user.id);
    const reviews = productIds.length
      ? await Review.findAll({ where: { product_id: { [Op.in]: productIds } }, attributes: ['rating'] })
      : [];

    const result = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: reviews.filter((r) => r.rating === rating).length
    }));

    return success(res, result, '获取评价分布成功');
  } catch (err) {
    console.error('获取评价分布失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 热销商品 TOP N
exports.getTopProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const products = await Product.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      order: [['sales', 'DESC']],
      limit
    });
    return success(res, products, '获取热销商品成功');
  } catch (err) {
    console.error('获取热销商品失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

/* ============================ 评论管理 ============================ */

// 商家名下商品的用户评价列表
exports.getReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, product_id, rating } = req.query;
    const offset = (page - 1) * limit;
    const productIds = await getMerchantProductIds(req.user.id);

    if (!productIds.length) {
      return success(
        res,
        { reviews: [], total: 0, avgRating: 0, pagination: { total: 0, page: 1, limit: Number(limit), totalPages: 0 } },
        '暂无评价'
      );
    }

    const where = { product_id: { [Op.in]: productIds } };
    if (product_id) where.product_id = parseInt(product_id);
    if (rating) where.rating = parseInt(rating);

    const { count, rows } = await Review.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'image', 'price'] },
        { model: User, as: 'user', attributes: ['id', 'username', 'nickname', 'avatar'] }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const allRatings = await Review.findAll({ where, attributes: ['rating'], raw: true });
    const avgRating = allRatings.length
      ? Number((allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length).toFixed(1))
      : 0;

    return success(
      res,
      {
        reviews: rows,
        total: count,
        avgRating,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      },
      '获取评价列表成功'
    );
  } catch (err) {
    console.error('获取商家评价失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

/* ============================ 售后管理 ============================ */

// 商家名下商品相关的售后申请列表
exports.getAfterSales = async (req, res) => {
  try {
    const { status } = req.query;
    const productIds = await getMerchantProductIds(req.user.id);

    if (!productIds.length) {
      return success(res, [], '暂无售后申请');
    }
    const orders = await Order.findAll({
      where: { product_id: { [Op.in]: productIds } },
      attributes: ['id']
    });
    const orderIds = orders.map((o) => o.id);
    if (!orderIds.length) {
      return success(res, [], '暂无售后申请');
    }

    const where = { order_id: { [Op.in]: orderIds } };
    if (status) where.status = status;

    const list = await AfterSale.findAll({
      where,
      include: [
        {
          model: Order,
          as: 'order',
          include: [
            { model: Product, as: 'product', attributes: ['id', 'name', 'image', 'price'] },
            { model: User, as: 'user', attributes: ['id', 'username', 'nickname'] }
          ]
        },
        { model: User, as: 'user', attributes: ['id', 'username', 'nickname', 'avatar'] }
      ],
      order: [['created_at', 'DESC']]
    });

    return success(res, list, '获取售后列表成功');
  } catch (err) {
    console.error('获取商家售后失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};
