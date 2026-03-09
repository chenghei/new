const { Op } = require('sequelize');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Category = require('../models/Category');
const { success, error, notFound } = require('../utils/response');

// 生成订单号
const generateOrderNo = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${year}${month}${day}${random}`;
};

// 获取订单列表
exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const { user } = req;

    if (!user) {
      return error(res, '请先登录', 401);
    }

    // 构建查询条件
    const where = {};

    // 按状态筛选
    if (status) {
      where.status = status;
    }

    // 计算偏移量
    const offset = (page - 1) * limit;

    // 查询订单列表
    let ordersQuery;
    
    if (user.role === 'admin') {
      // 管理员可以看到所有订单
      ordersQuery = Order.findAndCountAll({
        where,
        include: [
          {
            model: Product,
            as: 'product',
            include: [
              {
                model: Category,
                as: 'category',
                attributes: ['id', 'name']
              },
              {
                model: User,
                as: 'merchant',
                attributes: ['id', 'username', 'nickname']
              }
            ]
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'nickname']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } else if (user.role === 'merchant') {
      // 商户可以查看自己的订单以及属于自己商品的订单
      // 先查询所有属于该商户的商品ID
      const merchantProducts = await Product.findAll({
        where: { user_id: user.id },
        attributes: ['id']
      });
      const merchantProductIds = merchantProducts.map(p => p.id);
      
      // 构建查询条件：自己的订单 或 属于自己商品的订单
      where[Op.or] = [
        { user_id: user.id },
        { product_id: { [Op.in]: merchantProductIds } }
      ];
      
      ordersQuery = Order.findAndCountAll({
        where,
        include: [
          {
            model: Product,
            as: 'product',
            include: [
              {
                model: Category,
                as: 'category',
                attributes: ['id', 'name']
              },
              {
                model: User,
                as: 'merchant',
                attributes: ['id', 'username', 'nickname']
              }
            ]
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'nickname']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } else {
      // 普通用户只能看到自己的订单
      where.user_id = user.id;
      
      ordersQuery = Order.findAndCountAll({
        where,
        include: [
          {
            model: Product,
            as: 'product',
            include: [
              {
                model: Category,
                as: 'category',
                attributes: ['id', 'name']
              },
              {
                model: User,
                as: 'merchant',
                attributes: ['id', 'username', 'nickname']
              }
            ]
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'nickname']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    }
    
    const { count, rows: orders } = await ordersQuery;

    return success(
      res,
      {
        orders,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      },
      '获取订单列表成功'
    );
  } catch (err) {
    console.error('获取订单列表失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 获取订单详情
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    if (!user) {
      return error(res, '请先登录', 401);
    }

    const order = await Order.findByPk(id, {
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name']
            },
            {
              model: User,
              as: 'merchant',
              attributes: ['id', 'username', 'nickname']
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });

    if (!order) {
      return notFound(res, '订单不存在');
    }

    // 普通用户只能查看自己的订单
    if (user.role !== 'admin' && order.user_id !== user.id) {
      return error(res, '无权限查看此订单', 403);
    }

    return success(res, order, '获取订单详情成功');
  } catch (err) {
    console.error('获取订单详情失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 创建订单
exports.createOrder = async (req, res) => {
  try {
    const { product_id, quantity = 1, remark } = req.body;
    const { user } = req;

    if (!user) {
      return error(res, '请先登录', 401);
    }

    // 验证商品是否存在
    const product = await Product.findByPk(product_id);
    if (!product) {
      return error(res, '商品不存在', 400);
    }

    // 计算总价
    const totalPrice = product.price * quantity;

    // 创建订单
    const order = await Order.create({
      order_no: generateOrderNo(),
      user_id: user.id,
      product_id,
      quantity: parseInt(quantity),
      total_price: totalPrice,
      status: 'ongoing',
      remark
    });

    // 返回包含关联数据的订单
    const orderWithDetails = await Order.findByPk(order.id, {
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            {
              model: User,
              as: 'merchant',
              attributes: ['id', 'username', 'nickname']
            }
          ]
        }
      ]
    });

    return success(res, orderWithDetails, '订单创建成功', 201);
  } catch (err) {
    console.error('创建订单失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 更新订单状态
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;
    const { user } = req;

    if (!user) {
      return error(res, '请先登录', 401);
    }

    const order = await Order.findByPk(id, {
      include: [
        {
          model: Product,
          as: 'product'
        }
      ]
    });

    if (!order) {
      return notFound(res, '订单不存在');
    }

    // 只有管理员和商品所属商户可以编辑订单状态
    const isAdmin = user.role === 'admin';
    const isMerchant = user.role === 'merchant' && order.product && order.product.user_id === user.id;
    
    if (!isAdmin && !isMerchant) {
      return error(res, '无权限更新此订单，只有管理员和商品所属商户可以编辑订单', 403);
    }

    // 验证状态值
    const validStatuses = ['ongoing', 'completed'];
    if (status && !validStatuses.includes(status)) {
      return error(res, '无效的订单状态', 400);
    }

    // 更新订单
    const updateData = {};
    if (status) updateData.status = status;
    if (remark !== undefined) updateData.remark = remark;

    await order.update(updateData);

    // 返回更新后的订单
    const updatedOrder = await Order.findByPk(id, {
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            {
              model: User,
              as: 'merchant',
              attributes: ['id', 'username', 'nickname']
            }
          ]
        }
      ]
    });

    return success(res, updatedOrder, '订单更新成功');
  } catch (err) {
    console.error('更新订单失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 获取订单统计
exports.getOrderStatistics = async (req, res) => {
  try {
    const { user } = req;

    if (!user) {
      return error(res, '请先登录', 401);
    }

    // 构建查询条件
    const where = {};

    // 普通用户只能查看自己的订单统计，管理员可以查看所有订单统计
    if (user.role !== 'admin') {
      where.user_id = user.id;
    }

    // 统计各状态订单数量
    const statistics = await Order.findAll({
      where,
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status']
    });

    // 统计总订单数和总金额
    const totalResult = await Order.findAll({
      where,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
        [sequelize.fn('SUM', sequelize.col('total_price')), 'totalAmount']
      ],
      raw: true
    });

    return success(
      res,
      {
        statusStatistics: statistics,
        total: totalResult[0]
      },
      '获取订单统计成功'
    );
  } catch (err) {
    console.error('获取订单统计失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};
