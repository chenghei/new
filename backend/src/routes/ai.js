const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth');

// AI个性化推荐
router.get('/recommend', authenticateToken, aiController.getRecommendations);

// AI购物助手对话
router.post('/chat', authenticateToken, aiController.chat);

// AI商品文案生成（商家端：根据商品名称/分类/特点生成标题、卖点、描述）
router.post('/product-copy', authenticateToken, aiController.generateProductCopy);

// AI评价分析（商家端：提取用户关注点、正负面评价与常见问题）
router.post('/review-analysis', authenticateToken, aiController.analyzeReviews);

module.exports = router;
