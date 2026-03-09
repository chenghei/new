const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');

// 获取购物车列表
router.get('/', authenticateToken, cartController.getCartList);

// 添加商品到购物车
router.post('/', authenticateToken, cartController.addToCart);

// 更新购物车商品数量
router.put('/:id', authenticateToken, cartController.updateCartQuantity);

// 删除购物车商品
router.delete('/:id', authenticateToken, cartController.deleteCartItem);

// 清空购物车
router.delete('/', authenticateToken, cartController.clearCart);

module.exports = router;
