const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// 商品评价列表（公开）
router.get('/product/:productId', optionalAuth, reviewController.getProductReviews);

// 我的评价列表
router.get('/mine', authenticateToken, reviewController.getMyReviews);

// 检查订单是否已评价
router.get('/check/:orderId', authenticateToken, reviewController.checkReviewed);

// 创建评价
router.post('/', authenticateToken, reviewController.createReview);

module.exports = router;
