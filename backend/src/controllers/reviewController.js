/**
 * 商品评价控制器（reviewController）—— 本次新增
 * ------------------------------------------------------------------
 * 提供用户端“商品评价”相关接口：
 *   createReview       POST /api/reviews                    创建评价（仅限本人已完成订单，一单一次）
 *   getProductReviews  GET  /api/reviews/product/:productId 商品评价列表（公开，含平均评分）
 *   getMyReviews       GET  /api/reviews/my                 我的评价列表
 *   checkReviewed      GET  /api/reviews/check/:orderId     查询订单是否已评价（控制评价按钮显隐）
 *
 * 业务规则：
 *   - 必须真实购买（订单属于本人且状态为 completed）才能评价；
 *   - 同一订单只能评价一次（数据库联合唯一索引兜底）。
 */
const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { success, error } = require('../utils/response');

// 创建商品评价（需已完成订单）
exports.createReview = async (req, res) => {
  try {
    const { order_id, rating, content } = req.body;
    const { user } = req;

    if (!order_id || !rating) {
      return error(res, '订单ID和评分不能为空', 400);
    }

    const ratingValue = parseInt(rating);
    if (ratingValue < 1 || ratingValue > 5) {
      return error(res, '评分必须在1到5星之间', 400);
    }

    // 校验订单：必须是本人已完成的订单
    const order = await Order.findOne({
      where: { id: order_id, user_id: user.id }
    });

    if (!order) {
      return error(res, '订单不存在', 404);
    }

    if (order.status !== 'completed') {
      return error(res, '订单完成后才能评价', 400);
    }

    // 一个订单只能评价一次
    const existing = await Review.findOne({
      where: { user_id: user.id, order_id }
    });

    if (existing) {
      return error(res, '该订单已评价过', 400);
    }

    const review = await Review.create({
      user_id: user.id,
      product_id: order.product_id,
      order_id,
      rating: ratingValue,
      content: content || ''
    });

    return success(res, review, '评价成功', 201);
  } catch (err) {
    console.error('创建评价失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 获取某商品的评价列表（公开）
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await Review.findAndCountAll({
      where: { product_id: productId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'nickname', 'avatar']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 计算平均评分
    const allRatings = await Review.findAll({
      where: { product_id: productId },
      attributes: ['rating'],
      raw: true
    });
    const avgRating = allRatings.length
      ? (allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length).toFixed(1)
      : 0;

    return success(res, {
      reviews: rows,
      avgRating: parseFloat(avgRating),
      total: count,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    }, '获取评价列表成功');
  } catch (err) {
    console.error('获取评价列表失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 获取我的评价列表
exports.getMyReviews = async (req, res) => {
  try {
    const { user } = req;

    const reviews = await Review.findAll({
      where: { user_id: user.id },
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'image', 'price']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return success(res, reviews, '获取我的评价成功');
  } catch (err) {
    console.error('获取我的评价失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 检查订单是否已评价
exports.checkReviewed = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { user } = req;

    const existing = await Review.findOne({
      where: { user_id: user.id, order_id: orderId }
    });

    return success(res, { reviewed: !!existing }, '查询成功');
  } catch (err) {
    console.error('查询评价状态失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};
