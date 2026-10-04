const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// 获取所有分类（支持排序）
router.get('/', categoryController.getCategories);

// 创建分类（仅管理员）
router.post('/', authenticateToken, requireAdmin, categoryController.createCategory);

// 更新分类（仅管理员，含启用/禁用）
router.put('/:id', authenticateToken, requireAdmin, categoryController.updateCategory);

// 删除分类（仅管理员）
router.delete('/:id', authenticateToken, requireAdmin, categoryController.deleteCategory);

module.exports = router;