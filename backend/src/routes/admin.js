const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const adminController = require('../controllers/adminController');
const aiAdminController = require('../controllers/aiAdminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// 管理端接口统一要求管理员身份
router.use(authenticateToken, requireAdmin);

/* ---------------- 商家入驻 / 资质审核 ---------------- */
router.get('/shops', auditController.getShops);
router.put('/shops/:id/audit', auditController.auditShop);

/* ---------------- 商品审核 ---------------- */
router.get('/products', auditController.getAuditProducts);
router.put('/products/:id/audit', auditController.auditProduct);

/* ---------------- 商家管理 ---------------- */
router.get('/merchants', adminController.getMerchants);
router.patch('/merchants/:id/status', adminController.setMerchantStatus);

/* ---------------- 售后监管 ---------------- */
router.get('/after-sales', adminController.getAfterSales);

/* ---------------- 平台数据统计 ---------------- */
router.get('/stats', adminController.getStats);
router.get('/sales-trend', adminController.getSalesTrend);
router.get('/user-growth', adminController.getUserGrowthTrend);
router.get('/order-status', adminController.getOrderStatusDistribution);
router.get('/category-distribution', adminController.getCategoryDistribution);
router.get('/recent-orders', adminController.getRecentOrders);

/* ---------------- AI 管理 ---------------- */
router.get('/ai/logs', aiAdminController.getLogs);
router.get('/ai/logs/:id', aiAdminController.getLogDetail);
router.delete('/ai/logs/:id', aiAdminController.deleteLog);
router.get('/ai/contents', aiAdminController.getGeneratedContents);
router.get('/ai/config', aiAdminController.getConfig);
router.put('/ai/config', aiAdminController.updateConfig);
router.post('/ai/config/test', aiAdminController.testConfig);

module.exports = router;
