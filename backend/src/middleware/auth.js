const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isTokenBlacklisted } = require('../config/redis');

// JWT认证中间件
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问令牌缺失'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 登出黑名单校验：已登出的 token 立即失效
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        message: '登录状态已失效，请重新登录'
      });
    }

    const user = await User.findByPk(decoded.userId);
    
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: '用户不存在或已被禁用'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: '令牌无效或已过期'
    });
  }
};

// 可选认证中间件：有合法token则解析用户，无token也放行（用于公开浏览接口）
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // 已登出的 token 按游客处理，不注入用户
      if (!(await isTokenBlacklisted(token))) {
        const user = await User.findByPk(decoded.userId);
        if (user && user.status === 'active') {
          req.user = user;
        }
      }
    }
  } catch (error) {
    // token无效时按游客处理，不阻断请求
  }
  next();
};

// 角色验证中间件
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    next();
  };
};

// 管理员权限中间件
const requireAdmin = requireRole(['admin']);

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireAdmin
};