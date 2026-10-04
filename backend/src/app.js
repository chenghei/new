const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const routes = require('./routes');

// 导入所有模型，确保 sequelize.sync 能同步全部数据表
require('./models/User');
require('./models/Category');
require('./models/Product');
require('./models/Cart');
require('./models/Order');
require('./models/Favorite');
require('./models/Review');
require('./models/AfterSale');
require('./models/BrowseHistory');
require('./models/Shop');
require('./models/AiLog');
require('./models/AiConfig');
require('./models/Address');

const app = express();
const PORT = process.env.PORT || 5000;

// 安全中间件（允许跨源加载静态资源，便于用户端直接引用 /uploads 图片）
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS配置（同时允许管理端、用户端与商家端）
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  process.env.MALL_URL || 'http://localhost:3001',
  process.env.MERCHANT_URL || 'http://localhost:3002',
  process.env.ADMIN_URL || 'http://localhost:3003',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003'
];
app.use(cors({
  origin: (origin, callback) => {
    // 允许无 origin 的请求（如 Postman、同源代理）
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('不允许的跨域来源'));
  },
  credentials: true
}));

// 请求日志
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 限流中间件
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: process.env.NODE_ENV === 'development' ? 3000 : 1000,
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  }
});
app.use('/api', limiter);

// 解析请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务：对外暴露本地上传目录（绝对路径，上传的图片通过 /uploads/文件名 访问）
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API路由
app.use('/api', routes);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 全局错误处理中间件
app.use((error, req, res, next) => {
  console.error('全局错误:', error);
  
  // Sequelize验证错误
  if (error.name === 'SequelizeValidationError') {
    const errors = error.errors.map(err => ({
      field: err.path,
      message: err.message
    }));
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors
    });
  }

  // Sequelize唯一约束错误
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: '数据已存在'
    });
  }

  // JWT错误
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '令牌无效'
    });
  }

  // 默认服务器错误
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
  });
});

// 启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    await testConnection();
    
    // 同步数据库模型
    // 说明：默认不开启 alter。alter:true 会在每次启动时重建唯一索引，
    //       多次重启会导致索引数量不断累积（MySQL 单表最多 64 个索引）并最终启动失败；
    //       确需同步表结构变更时，可临时设置环境变量 DB_SYNC_ALTER=true 启动一次。
    await sequelize.sync(process.env.DB_SYNC_ALTER === 'true' ? { alter: true } : {});
    console.log('数据库模型同步成功');
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
      console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API地址: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  await sequelize.close();
  process.exit(0);
});

startServer();

module.exports = app;