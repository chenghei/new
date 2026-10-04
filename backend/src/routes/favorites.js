const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const { authenticateToken } = require('../middleware/auth');

// 我的收藏列表
router.get('/', authenticateToken, favoriteController.getFavorites);

// 收藏/取消收藏
router.post('/toggle', authenticateToken, favoriteController.toggleFavorite);

// 检查商品是否已收藏
router.get('/check/:productId', authenticateToken, favoriteController.checkFavorite);

// 删除收藏
router.delete('/:id', authenticateToken, favoriteController.removeFavorite);

module.exports = router;
