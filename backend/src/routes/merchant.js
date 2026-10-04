const express = require('express');
const router = express.Router();
const merchantController = require('../controllers/merchantController');
const { authenticateToken } = require('../middleware/auth');

/* ---------------- 店铺管理 ---------------- */
// 我的店铺信息（含审核状态）
router.get('/shop', authenticateToken, merchantController.getMyShop);
// 提交入驻申请（含资质信息）
router.post('/shop', authenticateToken, merchantController.applyShop);
// 维护店铺基本信息（被拒后提交将重新进入待审核）
router.put('/shop', authenticateToken, merchantController.updateShop);

/* ---------------- 数据统计 ---------------- */
// 店铺运营概览
router.get('/stats', authenticateToken, merchantController.getStats);
// 近 N 天销售趋势
router.get('/sales-trend', authenticateToken, merchantController.getSalesTrend);
// 订单状态分布
router.get('/order-status', authenticateToken, merchantController.getOrderStatusDistribution);
// 评价星级分布
router.get('/review-rating', authenticateToken, merchantController.getReviewRatingDistribution);
// 热销商品 TOP
router.get('/top-products', authenticateToken, merchantController.getTopProducts);

/* ---------------- 评论管理 ---------------- */
// 商家名下商品评价列表
router.get('/reviews', authenticateToken, merchantController.getReviews);

/* ---------------- 售后管理 ---------------- */
// 商家名下商品相关售后申请
router.get('/after-sales', authenticateToken, merchantController.getAfterSales);

module.exports = router;
