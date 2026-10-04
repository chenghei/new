const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const { authenticateToken } = require('../middleware/auth');

// 我的地址列表
router.get('/', authenticateToken, addressController.getAddresses);

// 新增地址
router.post('/', authenticateToken, addressController.createAddress);

// 编辑地址
router.put('/:id', authenticateToken, addressController.updateAddress);

// 删除地址
router.delete('/:id', authenticateToken, addressController.deleteAddress);

// 设为默认地址
router.put('/:id/default', authenticateToken, addressController.setDefaultAddress);

module.exports = router;
