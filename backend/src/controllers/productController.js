const { Op } = require('sequelize');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { success, error, notFound } = require('../utils/response');

// 获取所有商品（支持分页、分类和名称查询）
exports.getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category_id, name, sortBy = 'created_at', order = 'desc' } = req.query;
    
    // 构建查询条件
    const where = {};
    
    if (category_id) {
      where.category_id = category_id;
    }
    
    if (name) {
      where.name = {
        [Op.like]: `%${name}%`
      };
    }
    
    // 验证排序字段
    const validSortFields = ['id', 'name', 'price', 'created_at', 'updated_at'];
    if (!validSortFields.includes(sortBy)) {
      return error(res, '无效的排序字段', 400);
    }
    
    // 验证排序顺序
    const validOrders = ['asc', 'desc'];
    if (!validOrders.includes(order)) {
      return error(res, '无效的排序顺序', 400);
    }
    
    // 计算偏移量
    const offset = (page - 1) * limit;
    
    // 查询商品列表
    const { count, rows: products } = await Product.findAndCountAll({
      where,
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name']
      }],
      order: [[sortBy, order]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    return success(
      res,
      {
        products,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      },
      '获取商品列表成功'
    );
  } catch (err) {
    console.error('获取商品列表失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 获取单个商品
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findByPk(id, {
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name']
      }]
    });
    
    if (!product) {
      return notFound(res, '商品不存在');
    }
    
    return success(res, product, '获取商品成功');
  } catch (err) {
    console.error('获取商品失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 创建商品
exports.createProduct = async (req, res) => {
  try {
    const { name, price, status, category_id, image } = req.body;
    
    // 验证分类是否存在
    const category = await Category.findByPk(category_id);
    if (!category) {
      return error(res, '分类不存在', 400);
    }
    
    const product = await Product.create({
      name,
      image,
      price,
      status,
      category_id
    });
    
    return success(res, product, '创建商品成功', 201);
  } catch (err) {
    console.error('创建商品失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 更新商品
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, status, category_id, image } = req.body;
    
    const product = await Product.findByPk(id);
    
    if (!product) {
      return notFound(res, '商品不存在');
    }
    
    // 验证分类是否存在
    if (category_id) {
      const category = await Category.findByPk(category_id);
      if (!category) {
        return error(res, '分类不存在', 400);
      }
    }
    
    // 构建更新对象
    const updateData = {
      name,
      image,
      price,
      status,
      category_id
    };
    
    await product.update(updateData);
    
    return success(res, product, '更新商品成功');
  } catch (err) {
    console.error('更新商品失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 删除商品
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findByPk(id);
    
    if (!product) {
      return notFound(res, '商品不存在');
    }
    
    await product.destroy();
    
    return success(res, null, '删除商品成功');
  } catch (err) {
    console.error('删除商品失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};