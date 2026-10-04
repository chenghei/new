const express = require('express');
const router = express.Router();
const afterSaleController = require('../controllers/afterSaleController');
const { authenticateToken } = require('../middleware/auth');

// 我的售后列表
router.get('/mine', authenticateToken, afterSaleController.getMyAfterSales);

// 售后详情
router.get('/:id', authenticateToken, afterSaleController.getAfterSaleById);

// 申请售后
router.post('/', authenticateToken, afterSaleController.applyAfterSale);

// 撤销售后
router.put('/:id/cancel', authenticateToken, afterSaleController.cancelAfterSale);

// 处理售后（管理员/商户）
router.put('/:id/process', authenticateToken, afterSaleController.processAfterSale);

module.exports = router;
