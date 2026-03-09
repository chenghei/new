const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

// 获取商城统计数据
router.get('/stats', authenticateToken, dashboardController.getDashboardStats);

// 获取最近订单列表
router.get('/recent-orders', authenticateToken, dashboardController.getRecentOrders);

module.exports = router;
