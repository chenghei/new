const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { success, error } = require('../utils/response');
const { validate, registerSchema, loginSchema } = require('../utils/validation');
const { Op } = require('sequelize');

// 用户注册
const register = async (req, res) => {
  try {
    // 验证请求数据
    const { isValid, errors, value } = validate(registerSchema, req.body);
    if (!isValid) {
      return error(res, '数据验证失败', 400, errors);
    }

    const { username, email, password, nickname } = value;

    // 检查用户名和邮箱是否已存在
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }]
      }
    });

    if (existingUser) {
      const field = existingUser.username === username ? '用户名' : '邮箱';
      return error(res, `${field}已被使用`, 400);
    }

    // 创建用户
    const user = await User.create({
      username,
      email,
      password,
      nickname: nickname || username
    });

    // 生成JWT令牌
    const token = generateToken({ userId: user.id });

    return success(res, {
      user: user.toSafeJSON(),
      token
    }, '注册成功', 201);

  } catch (err) {
    console.error('注册错误:', err);
    return error(res, '注册失败', 500);
  }
};

// 用户登录
const login = async (req, res) => {
  try {
    // 验证请求数据
    const { isValid, errors, value } = validate(loginSchema, req.body);
    if (!isValid) {
      return error(res, '数据验证失败', 400, errors);
    }

    const { username, password } = value;

    // 查找用户（支持用户名和邮箱登录）
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email: username }
        ]
      }
    });

    if (!user) {
      return error(res, '用户名或密码错误', 401);
    }

    // 检查用户状态
    if (user.status !== 'active') {
      return error(res, '账户已被禁用', 403);
    }

    // 验证密码
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      return error(res, '用户名或密码错误', 401);
    }

    // 生成JWT令牌
    const token = generateToken({ userId: user.id });

    return success(res, {
      user: user.toSafeJSON(),
      token
    }, '登录成功');

  } catch (err) {
    console.error('登录错误:', err);
    return error(res, '登录失败', 500);
  }
};

// 获取当前用户信息
const getProfile = async (req, res) => {
  try {
    return success(res, {
      user: req.user.toSafeJSON()
    }, '获取用户信息成功');
  } catch (err) {
    console.error('获取用户信息错误:', err);
    return error(res, '获取用户信息失败', 500);
  }
};

// 用户登出（客户端删除token即可）
const logout = async (req, res) => {
  try {
    return success(res, null, '登出成功');
  } catch (err) {
    console.error('登出错误:', err);
    return error(res, '登出失败', 500);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  logout
};