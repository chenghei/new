const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateUser,
  updatePassword,
  deleteUser,
  toggleUserStatus
} = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// 获取用户列表（需要管理员权限）
router.get('/', authenticateToken, requireAdmin, getUsers);

// 获取用户详情（需要认证）
router.get('/:id', authenticateToken, getUserById);

// 更新用户信息（需要认证，只能修改自己的信息或管理员可以修改所有用户）
router.put('/:id', authenticateToken, updateUser);

// 更新密码（需要认证，只能修改自己的密码）
router.put('/:id/password', authenticateToken, updatePassword);

// 删除用户（需要管理员权限）
router.delete('/:id', authenticateToken, requireAdmin, deleteUser);

// 切换用户状态（需要管理员权限）
router.patch('/:id/status', authenticateToken, requireAdmin, toggleUserStatus);

module.exports = router;