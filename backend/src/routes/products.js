const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const upload = require("../utils/upload");
const { success, error, notFound } = require('../utils/response');

// 获取所有商品（支持分页、分类和名称查询）
router.get("/", productController.getProducts);

// 获取单个商品
router.get("/:id", productController.getProductById);

// 创建商品
router.post("/", productController.createProduct);

// 更新商品
router.put("/:id", productController.updateProduct);

// 删除商品
router.delete("/:id", productController.deleteProduct);

// 上传图片
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    return success(res, file.filename, '上传成功');
  } catch (err) {
    console.log(err, "err");
    return error(res, '上传失败', 400);
  }
});

module.exports = router;
