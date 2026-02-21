const User = require('../models/User');
const { success, error, notFound } = require('../utils/response');
const { validate, updateUserSchema, updatePasswordSchema } = require('../utils/validation');
const { Op } = require('sequelize');

// 获取用户列表
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    const offset = (page - 1) * limit;

    const whereCondition = {};
    
    // 搜索条件
    if (search) {
      whereCondition[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { nickname: { [Op.like]: `%${search}%` } }
      ];
    }

    // 角色过滤
    if (role) {
      whereCondition.role = role;
    }

    const { count, rows } = await User.findAndCountAll({
      where: whereCondition,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return success(res, {
      users: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    }, '获取用户列表成功');

  } catch (err) {
    console.error('获取用户列表错误:', err);
    return error(res, '获取用户列表失败', 500);
  }
};

// 获取用户详情
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return notFound(res, '用户不存在');
    }

    return success(res, { user }, '获取用户详情成功');

  } catch (err) {
    console.error('获取用户详情错误:', err);
    return error(res, '获取用户详情失败', 500);
  }
};

// 更新用户信息
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 验证请求数据
    const { isValid, errors, value } = validate(updateUserSchema, req.body);
    if (!isValid) {
      return error(res, '数据验证失败', 400, errors);
    }

    const user = await User.findByPk(id);
    if (!user) {
      return notFound(res, '用户不存在');
    }

    // 检查权限：只能修改自己的信息，或者管理员可以修改所有用户信息
    if (req.user.id !== parseInt(id) && req.user.role !== 'admin') {
      return error(res, '权限不足', 403);
    }

    await user.update(value);

    return success(res, {
      user: user.toSafeJSON()
    }, '更新用户信息成功');

  } catch (err) {
    console.error('更新用户信息错误:', err);
    return error(res, '更新用户信息失败', 500);
  }
};

// 更新密码
const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 验证请求数据
    const { isValid, errors, value } = validate(updatePasswordSchema, req.body);
    if (!isValid) {
      return error(res, '数据验证失败', 400, errors);
    }

    const user = await User.findByPk(id);
    if (!user) {
      return notFound(res, '用户不存在');
    }

    // 检查权限：只能修改自己的密码
    if (req.user.id !== parseInt(id)) {
      return error(res, '权限不足', 403);
    }

    const { oldPassword, newPassword } = value;

    // 验证旧密码
    const isOldPasswordValid = await user.validatePassword(oldPassword);
    if (!isOldPasswordValid) {
      return error(res, '旧密码错误', 400);
    }

    // 更新密码
    await user.update({ password: newPassword });

    return success(res, null, '密码更新成功');

  } catch (err) {
    console.error('更新密码错误:', err);
    return error(res, '更新密码失败', 500);
  }
};

// 删除用户
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      return notFound(res, '用户不存在');
    }

    // 不能删除自己
    if (req.user.id === parseInt(id)) {
      return error(res, '不能删除自己的账户', 400);
    }

    await user.destroy();

    return success(res, null, '删除用户成功');

  } catch (err) {
    console.error('删除用户错误:', err);
    return error(res, '删除用户失败', 500);
  }
};

// 切换用户状态
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      return notFound(res, '用户不存在');
    }

    // 不能禁用自己
    if (req.user.id === parseInt(id)) {
      return error(res, '不能禁用自己的账户', 400);
    }

    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    await user.update({ status: newStatus });

    return success(res, {
      user: user.toSafeJSON()
    }, `用户已${newStatus === 'active' ? '启用' : '禁用'}`);

  } catch (err) {
    console.error('切换用户状态错误:', err);
    return error(res, '切换用户状态失败', 500);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  updatePassword,
  deleteUser,
  toggleUserStatus
};