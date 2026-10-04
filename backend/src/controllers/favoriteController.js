/**
 * 收藏控制器（favoriteController）—— 本次新增
 * ------------------------------------------------------------------
 * 提供用户端“商品收藏”相关接口：
 *   getFavorites    GET    /api/favorites                我的收藏列表（含商品/分类/商户信息）
 *   toggleFavorite  POST   /api/favorites/toggle         收藏/取消收藏（开关式，前端一个按钮即可）
 *   checkFavorite   GET    /api/favorites/check/:productId  查询某商品是否已收藏（详情页图标状态）
 *   removeFavorite  DELETE /api/favorites/:id            按收藏记录ID删除
 * 所有接口均需登录（路由层挂 authenticateToken）。
 */
const Favorite = require('../models/Favorite');
const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const { success, error } = require('../utils/response');

// 获取我的收藏列表
exports.getFavorites = async (req, res) => {
  try {
    const { user } = req;

    const favorites = await Favorite.findAll({
      where: { user_id: user.id },
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name']
            },
            {
              model: User,
              as: 'merchant',
              attributes: ['id', 'username', 'nickname']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return success(res, favorites, '获取收藏列表成功');
  } catch (err) {
    console.error('获取收藏列表失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 收藏/取消收藏（开关式）
exports.toggleFavorite = async (req, res) => {
  try {
    const { product_id } = req.body;
    const { user } = req;

    if (!product_id) {
      return error(res, '商品ID不能为空', 400);
    }

    const product = await Product.findByPk(product_id);
    if (!product) {
      return error(res, '商品不存在', 400);
    }

    const existing = await Favorite.findOne({
      where: { user_id: user.id, product_id }
    });

    if (existing) {
      await existing.destroy();
      return success(res, { favorited: false }, '已取消收藏');
    }

    try {
      await Favorite.create({ user_id: user.id, product_id });
    } catch (createErr) {
      // 并发下多个请求同时收藏同一商品时，唯一索引会拦截后到的插入；
      // 此处按「已收藏」返回，保证接口幂等且不返回 500
      if (createErr.name === 'SequelizeUniqueConstraintError') {
        return success(res, { favorited: true }, '收藏成功', 201);
      }
      throw createErr;
    }

    return success(res, { favorited: true }, '收藏成功', 201);
  } catch (err) {
    console.error('收藏操作失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 检查某商品是否已收藏
exports.checkFavorite = async (req, res) => {
  try {
    const { productId } = req.params;
    const { user } = req;

    const existing = await Favorite.findOne({
      where: { user_id: user.id, product_id: productId }
    });

    return success(res, { favorited: !!existing }, '查询成功');
  } catch (err) {
    console.error('查询收藏状态失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 删除收藏
exports.removeFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const favorite = await Favorite.findOne({
      where: { id, user_id: user.id }
    });

    if (!favorite) {
      return error(res, '收藏记录不存在', 404);
    }

    await favorite.destroy();
    return success(res, null, '已取消收藏');
  } catch (err) {
    console.error('取消收藏失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};
