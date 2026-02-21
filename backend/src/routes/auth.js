const express = require('express');
const router = express.Router();
const { register, login, getProfile, logout } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// 用户注册
router.post('/register', register);

// 用户登录
router.post('/login', login);

// 获取当前用户信息（需要认证）
router.get('/profile', authenticateToken, getProfile);

// 用户登出（需要认证）
router.post('/logout', authenticateToken, logout);

module.exports = router;