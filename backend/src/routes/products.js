const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const upload = require("../utils/upload");
const { success, error, notFound } = require('../utils/response');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// 获取所有商品（公开浏览，登录用户会附带个性化行为记录）
router.get("/", optionalAuth, productController.getProducts);

// 获取单个商品（公开浏览，登录用户自动记录浏览历史）
router.get("/:id", optionalAuth, productController.getProductById);

// 创建商品
router.post("/", authenticateToken, productController.createProduct);

// 更新商品
router.put("/:id", authenticateToken, productController.updateProduct);

// 删除商品
router.delete("/:id", authenticateToken, productController.deleteProduct);

// 上传图片
router.post("/upload", authenticateToken, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    return success(res, file.filename, '上传成功');
  } catch (err) {
    console.log(err, "err");
    return error(res, '上传失败', 400);
  }
});

module.exports = router;
