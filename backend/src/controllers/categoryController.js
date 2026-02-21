const Category = require("../models/Category");
const { success, error, notFound } = require("../utils/response");
const { Op } = require('sequelize');
// 获取所有分类（支持排序）
exports.getCategories = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "sort",
      order = "asc",
    } = req.query;
    const offset = (page - 1) * limit;
    const whereCondition = {};

    // 搜索条件
    if (search) {
      whereCondition[Op.or] = [{ name: { [Op.like]: `%${search}%` } }];
    }

    // 验证排序字段
    const validSortFields = ["id", "name", "sort", "created_at", "updated_at"];
    if (!validSortFields.includes(sortBy)) {
      return error(res, "无效的排序字段", 400);
    }

    // 验证排序顺序
    const validOrders = ["asc", "desc"];
    if (!validOrders.includes(order)) {
      return error(res, "无效的排序字段", 400);
    }

    const { count, rows } = await Category.findAndCountAll({
      where: whereCondition,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, order]],
    });
    return success(
      res,
      {
        users: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      },
      "获取用户列表成功"
    );
  } catch (err) {
    console.error("获取分类失败:", err);
    return error(res, "获取用户列表失败", 500);
  }
};

// 创建分类
exports.createCategory = async (req, res) => {
  try {
    const { name, description, sort } = req.body;

    const category = await Category.create({
      name,
      description,
      sort: sort || 0,
    });
    return success(res, category, '创建分类成功', 201);

  } catch (err) {
    console.error("创建分类失败:", err);

    // 处理唯一约束错误
    if (err.name === "SequelizeUniqueConstraintError") {
      return error(res, '分类名称已存在', 400);
    }
    error(res, '服务器内部错误', 500);
  }
};

// 更新分类
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sort, status } = req.body;

    const category = await Category.findByPk(id);

    if (!category) {
      return error(res, '分类不存在', 400);

    }

    await category.update({
      name,
      description,
      sort,
      status,
    });
    success(res, category, '更新分类成功', 201);
  } catch (err) {
    console.error("更新分类失败:", err);

    // 处理唯一约束错误
    if (err.name === "SequelizeUniqueConstraintError") {
      return error(res, '分类名称已存在', 400);
    }
    error(res, '数据验证失败', 500);
  }
};

// 删除分类（软删除，修改状态为inactive）
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);

    if (!category) {
      return notFound(res, '分类不存在');
    }

    // 检查该分类下是否有商品
    const Product = require('../models/Product');
    const productCount = await Product.count({
      where: { category_id: id }
    });

    if (productCount > 0) {
      return error(res, `该分类下有${productCount}个商品，无法删除`, 400);
    }

    await category.destroy();
    return success(res, null, '删除分类成功');
  } catch (err) {
    console.error('删除分类失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};
