const express = require('express');
const router = express.Router();

// 导入子路由
const authRoutes = require('./auth');
const userRoutes = require('./users');
const categoryRoutes = require('./categories');
const productRoutes = require('./products');

// 注册路由
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);

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