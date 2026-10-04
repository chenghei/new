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

// 批量下单（购物车结算）
router.post('/batch', authenticateToken, orderController.batchCreateOrders);

// 模拟支付
router.post('/:id/pay', authenticateToken, orderController.payOrder);

// 确认收货
router.post('/:id/confirm', authenticateToken, orderController.confirmOrder);

// 取消订单
router.post('/:id/cancel', authenticateToken, orderController.cancelOrder);

// 更新订单状态
router.put('/:id', authenticateToken, orderController.updateOrderStatus);

module.exports = router;
