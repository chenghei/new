const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/auth');

// 获取订单列表
router.get('/', authenticateToken, orderController.getOrders);

// 获取订单统计
router.get('/statistics', authenticateToken, orderController.getOrderStatistics);

// 获取订单详情
router.get('/:id', authenticateToken, orderController.getOrderById);

// 创建订单
router.post('/', authenticateToken, orderController.createOrder);

// 更新订单状态
router.put('/:id', authenticateToken, orderController.updateOrderStatus);

module.exports = router;
