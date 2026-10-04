const { Op } = require("sequelize");
const Product = require("../models/Product");
const Category = require("../models/Category");
const User = require("../models/User");
const Shop = require("../models/Shop");
const BrowseHistory = require("../models/BrowseHistory");
const { success, error, notFound } = require("../utils/response");

// 获取所有商品（支持分页、分类和名称查询）
exports.getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category_id,
      name,
      keyword,
      price_min,
      price_max,
      sortBy = "created_at",
      order = "desc",
      merchant_id,
      audit_status,
      scope = "all", // scope=all 查看所有商品，scope=mine 查看自己的商品
    } = req.query;
    const { user } = req;

    // 构建查询条件
    const where = {};

    // 如果指定了 scope=mine，只查看自己的商品
    if (scope === "mine" && user) {
      where.user_id = user.id;
    } else if (merchant_id) {
      // 如果提供了 merchant_id，按商户筛选
      where.user_id = merchant_id;
    }
    // 默认情况下（scope=all），不限制用户ID，查看所有商品

    // 非管理员浏览商城时只能看到上架且审核通过的商品
    // 商家本人仍可看到自己尚未通过审核的商品（便于在商家后台管理）
    if (scope !== "mine" && (!user || user.role !== "admin")) {
      const andConditions = [{ status: "active" }];
      if (user) {
        andConditions.push({
          [Op.or]: [{ audit_status: "approved" }, { user_id: user.id }],
        });
      } else {
        andConditions.push({ audit_status: "approved" });
      }
      where[Op.and] = andConditions;
    }

    if (category_id) {
      where.category_id = category_id;
    }

    // 审核状态筛选（管理端商品审核使用）
    if (audit_status) {
      where.audit_status = audit_status;
    }

    // 关键词搜索：匹配名称或描述
    const searchWord = keyword || name;
    if (searchWord) {
      where[Op.or] = [
        { name: { [Op.like]: `%${searchWord}%` } },
        { description: { [Op.like]: `%${searchWord}%` } },
      ];
    }

    // 价格区间筛选
    if (price_min !== undefined && price_min !== "") {
      where.price = { ...(where.price || {}), [Op.gte]: parseFloat(price_min) };
    }
    if (price_max !== undefined && price_max !== "") {
      where.price = { ...(where.price || {}), [Op.lte]: parseFloat(price_max) };
    }

    // 验证排序字段
    const validSortFields = ["id", "name", "price", "sales", "created_at", "updated_at"];
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

    // 下架商品仅本人和管理员可见
    if (product.status !== "active") {
      if (!user || (user.role !== "admin" && product.user_id !== user.id)) {
        return error(res, "商品已下架", 403);
      }
    }

    // 未通过审核的商品仅本人和管理员可见
    if (product.audit_status !== "approved") {
      if (!user || (user.role !== "admin" && product.user_id !== user.id)) {
        return error(res, "商品正在审核中或未通过审核", 403);
      }
    }

    // 登录用户浏览商品时记录浏览历史（用于AI推荐）
    if (user) {
      try {
        await BrowseHistory.upsert({
          user_id: user.id,
          product_id: product.id
        });
      } catch (e) {
        console.warn('记录浏览历史失败:', e.message);
      }
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
      description,
      stock,
      user_id: reqUserId,
    } = req.body;
    const { user } = req;

    // 验证用户是否登录
    if (!user) {
      return error(res, "请先登录", 401);
    }

    // 确定商品所属用户ID
    let productUserId;
    if (user.role === "admin" && reqUserId) {
      // 管理员可以指定商户ID
      const targetUser = await User.findByPk(reqUserId);
      if (!targetUser) {
        return error(res, "指定的商户不存在", 400);
      }
      if (targetUser.role !== "merchant") {
        return error(res, "指定的用户不是商户", 400);
      }
      productUserId = reqUserId;
    } else if (user.role === "merchant") {
      // 商户角色自动使用自己的user_id
      productUserId = user.id;
    } else {
      // 普通用户创建商品也绑定自己
      productUserId = user.id;
    }

    // 商品分类由店铺经营类目决定：商家已设置经营类目时，忽略前端传入的分类
    let finalCategoryId = category_id;
    const shop = await Shop.findOne({ where: { user_id: productUserId } });
    if (shop && shop.category_id) {
      finalCategoryId = shop.category_id;
    }

    // 验证分类是否存在
    const category = await Category.findByPk(finalCategoryId);
    if (!category) {
      return error(res, "分类不存在", 400);
    }

    const product = await Product.create({
      name,
      image,
      price,
      status,
      category_id: finalCategoryId,
      description,
      stock: stock !== undefined ? parseInt(stock) : 100,
      user_id: productUserId,
      // 管理员发布直接生效；商家/用户发布需经平台审核
      audit_status: user.role === "admin" ? "approved" : "pending",
      audit_remark: null,
    });

    return success(
      res,
      product,
      user.role === "admin" ? "创建商品成功" : "商品已提交审核",
      201
    );
  } catch (err) {
    console.error("创建商品失败:", err);
    return error(res, "服务器内部错误", 500);
  }
};

// 更新商品
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, status, category_id, image, description, stock } = req.body;
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

    // 商家修改商品“内容”后需重新审核；仅切换上下架状态不触发重新审核；管理员修改直接生效
    const contentChanged = ["name", "image", "price", "category_id", "description", "stock"].some(
      (field) => req.body[field] !== undefined
    );
    const auditFields =
      user.role === "admin" || !contentChanged
        ? {}
        : { audit_status: "pending", audit_remark: null };

    await product.update({
      name,
      image,
      price,
      status,
      category_id,
      description,
      stock: stock !== undefined ? parseInt(stock) : product.stock,
      ...auditFields,
    });

    return success(
      res,
      product,
      user.role === "admin" ? "更新商品成功" : contentChanged ? "商品已提交审核" : "更新商品成功"
    );
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
