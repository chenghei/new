const { Op } = require("sequelize");
const Product = require("../models/Product");
const Category = require("../models/Category");
const User = require("../models/User");
const { success, error, notFound } = require("../utils/response");

// 获取所有商品（支持分页、分类和名称查询）
exports.getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category_id,
      name,
      sortBy = "created_at",
      order = "desc",
      merchant_id,
    } = req.query;
    const { user } = req;

    // 构建查询条件
    const where = {};

    // 如果用户不是admin，只能看到自己的商品
    if (user && user.role !== "admin") {
      where.user_id = user.id;
    } else if (merchant_id) {
      // 如果是管理员，并且提供了merchant_id，按商户筛选
      where.user_id = merchant_id;
    }

    if (category_id) {
      where.category_id = category_id;
    }

    if (name) {
      where.name = {
        [Op.like]: `%${name}%`,
      };
    }

    // 验证排序字段
    const validSortFields = ["id", "name", "price", "created_at", "updated_at"];
    if (!validSortFields.includes(sortBy)) {
      return error(res, "无效的排序字段", 400);
    }

    // 验证排序顺序
    const validOrders = ["asc", "desc"];
    if (!validOrders.includes(order)) {
      return error(res, "无效的排序顺序", 400);
    }

    // 计算偏移量
    const offset = (page - 1) * limit;

    // 查询商品列表
    const { count, rows: products } = await Product.findAndCountAll({
      where,
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "merchant",
          attributes: ["id", "username", "nickname"],
        },
      ],
      order: [[sortBy, order]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return success(
      res,
      {
        products,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      },
      "获取商品列表成功"
    );
  } catch (err) {
    console.error("获取商品列表失败:", err);
    return error(res, "服务器内部错误", 500);
  }
};

// 获取单个商品
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const product = await Product.findByPk(id, {
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "merchant",
          attributes: ["id", "username", "nickname"],
        },
      ],
    });

    if (!product) {
      return notFound(res, "商品不存在");
    }

    // 如果用户不是admin，只能查看自己的商品
    if (user && user.role !== "admin" && product.user_id !== user.id) {
      return error(res, "无权限查看此商品", 403);
    }

    return success(res, product, "获取商品成功");
  } catch (err) {
    console.error("获取商品失败:", err);
    return error(res, "服务器内部错误", 500);
  }
};

// 创建商品
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      price,
      status,
      category_id,
      image,
      user_id: reqUserId,
    } = req.body;
    const { user } = req;

    // 验证用户是否登录
    if (!user) {
      return error(res, "请先登录", 401);
    }

    // 验证分类是否存在
    const category = await Category.findByPk(category_id);
    if (!category) {
      return error(res, "分类不存在", 400);
    }

    // 确定商品所属用户ID
    let productUserId;
    if (user.role === "admin" && reqUserId) {
      // 管理员可以指定商户ID
      const targetUser = await User.findByPk(reqUserId);
      console.log(targetUser, "targetUser");
      if (!targetUser) {
        return error(res, "指定的商户不存在", 400);
      }
      if (targetUser.role !== "merchant") {
        return error(res, "指定的用户不是商户", 400);
      }
      productUserId = reqUserId;
    } else {
      if (!reqUserId) {
        return error(res, "请选择指定商户", 400);
      }
      // 商户和普通用户只能创建属于自己的商品
      productUserId = user.id;
    }

    const product = await Product.create({
      name,
      image,
      price,
      status,
      category_id,
      user_id: productUserId,
    });

    return success(res, product, "创建商品成功", 201);
  } catch (err) {
    console.error("创建商品失败:", err);
    return error(res, "服务器内部错误", 500);
  }
};

// 更新商品
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, status, category_id, image } = req.body;
    const { user } = req;

    // 验证用户是否登录
    if (!user) {
      return error(res, "请先登录", 401);
    }

    const product = await Product.findByPk(id);

    if (!product) {
      return notFound(res, "商品不存在");
    }

    // 如果用户不是admin，只能更新自己的商品
    if (user.role !== "admin" && product.user_id !== user.id) {
      return error(res, "无权限更新此商品", 403);
    }

    // 验证分类是否存在
    if (category_id) {
      const category = await Category.findByPk(category_id);
      if (!category) {
        return error(res, "分类不存在", 400);
      }
    }

    await product.update({
      name,
      image,
      price,
      status,
      category_id,
    });

    return success(res, product, "更新商品成功");
  } catch (err) {
    console.error("更新商品失败:", err);
    return error(res, "服务器内部错误", 500);
  }
};

// 删除商品
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // 验证用户是否登录
    if (!user) {
      return error(res, "请先登录", 401);
    }

    const product = await Product.findByPk(id);

    if (!product) {
      return notFound(res, "商品不存在");
    }

    // 如果用户不是admin，只能删除自己的商品
    if (user.role !== "admin" && product.user_id !== user.id) {
      return error(res, "无权限删除此商品", 403);
    }

    await product.destroy();
    return success(res, null, "删除商品成功");
  } catch (err) {
    console.error("删除商品失败:", err);
    return error(res, "服务器内部错误", 500);
  }
};
