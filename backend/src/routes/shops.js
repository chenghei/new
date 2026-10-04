const express = require('express');
const router = express.Router();
const merchantController = require('../controllers/merchantController');

// 公开接口：已通过审核的商家（店铺）列表
// 供用户端「AI 购物助手 → 找商家商品」按商家浏览商品
router.get('/', merchantController.getPublicShops);

module.exports = router;
