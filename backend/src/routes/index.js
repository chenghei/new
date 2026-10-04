const express = require('express');
const router = express.Router();

// 导入子路由
const authRoutes = require('./auth');
const userRoutes = require('./users');
const categoryRoutes = require('./categories');
const productRoutes = require('./products');
const cartRoutes = require('./cart');
const orderRoutes = require('./orders');
const dashboardRoutes = require('./dashboard');
const favoriteRoutes = require('./favorites');
const reviewRoutes = require('./reviews');
const afterSaleRoutes = require('./afterSales');
const aiRoutes = require('./ai');
const merchantRoutes = require('./merchant');
const adminRoutes = require('./admin');
const addressRoutes = require('./addresses');
const shopRoutes = require('./shops');

// 注册路由
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/reviews', reviewRoutes);
router.use('/after-sales', afterSaleRoutes);
router.use('/ai', aiRoutes);
router.use('/merchant', merchantRoutes);
router.use('/admin', adminRoutes);
router.use('/addresses', addressRoutes);
router.use('/shops', shopRoutes);

// 健康检查接口
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API服务运行正常',
    timestamp: new Date().toISOString()
  });
});

// 根路径
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '欢迎使用全栈开发模板API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;