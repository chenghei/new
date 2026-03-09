const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const Category = require('../models/Category');
const { success, error, notFound } = require('../utils/response');

// 获取购物车列表
exports.getCartList = async (req, res) => {
  try {
    const { user } = req;
    
    if (!user) {
      return error(res, '请先登录', 401);
    }

    const carts = await Cart.findAll({
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

    return success(res, carts, '获取购物车列表成功');
  } catch (err) {
    console.error('获取购物车列表失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 添加商品到购物车
exports.addToCart = async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    const { user } = req;

    if (!user) {
      return error(res, '请先登录', 401);
    }

    // 验证商品是否存在
    const product = await Product.findByPk(product_id);
    if (!product) {
      return error(res, '商品不存在', 400);
    }

    // 检查商品是否已存在于购物车
    const existingCart = await Cart.findOne({
      where: {
        user_id: user.id,
        product_id
      }
    });

    if (existingCart) {
      // 如果已存在，更新数量
      existingCart.quantity += parseInt(quantity);
      await existingCart.save();
      return success(res, existingCart, '购物车商品数量已更新');
    }

    // 如果不存在，创建新的购物车记录
    const cart = await Cart.create({
      user_id: user.id,
      product_id,
      quantity: parseInt(quantity)
    });

    return success(res, cart, '商品已添加到购物车', 201);
  } catch (err) {
    console.error('添加到购物车失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 更新购物车商品数量
exports.updateCartQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const { user } = req;

    if (!user) {
      return error(res, '请先登录', 401);
    }

    const cart = await Cart.findOne({
      where: {
        id,
        user_id: user.id
      }
    });

    if (!cart) {
      return notFound(res, '购物车商品不存在');
    }

    if (quantity < 1) {
      return error(res, '商品数量不能小于1', 400);
    }

    cart.quantity = parseInt(quantity);
    await cart.save();

    return success(res, cart, '购物车商品数量已更新');
  } catch (err) {
    console.error('更新购物车商品数量失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 删除购物车商品
exports.deleteCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    if (!user) {
      return error(res, '请先登录', 401);
    }

    const cart = await Cart.findOne({
      where: {
        id,
        user_id: user.id
      }
    });

    if (!cart) {
      return notFound(res, '购物车商品不存在');
    }

    await cart.destroy();
    return success(res, null, '购物车商品已删除');
  } catch (err) {
    console.error('删除购物车商品失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 清空购物车
exports.clearCart = async (req, res) => {
  try {
    const { user } = req;

    if (!user) {
      return error(res, '请先登录', 401);
    }

    await Cart.destroy({
      where: { user_id: user.id }
    });

    return success(res, null, '购物车已清空');
  } catch (err) {
    console.error('清空购物车失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};
