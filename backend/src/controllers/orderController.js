/**
 * 订单控制器（orderController）—— 本次扩展改造
 * ------------------------------------------------------------------
 * 为支持用户端完整的“下单 → 支付 → 发货 → 收货 → 评价 → 售后”闭环，
 * 对原有控制器进行了以下改动：
 *
 * 1. 订单状态扩展：由 2 种状态（ongoing / completed）扩展为 5 种状态机：
 *      pending   待支付  →  paid     已支付  →  shipped 已发货  →  completed 已完成
 *      cancelled 已取消（可取消 pending 状态的订单，库存自动回补）
 *
 * 2. 下单逻辑增强：
 *      createOrder      单商品下单（创建订单同时扣减库存、累加销量）
 *      batchCreateOrders 购物车批量结算（数据库事务保证原子性，结算后删除购物车项）
 *      新增收货人信息字段：receiver_name / receiver_phone / receiver_address
 *
 * 3. 用户端操作接口：
 *      payOrder    模拟支付（pending → paid）
 *      confirmOrder 确认收货（shipped → completed）
 *      cancelOrder  取消订单（pending → cancelled，回补库存与销量）
 *
 * 4. 权限模型：
 *      admin    可查看、修改所有订单；
 *      merchant 可查看自己的订单及属于自己商品的订单，可更新自己商品订单状态；
 *      user     仅可查看、操作自己的订单。
 */
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Category = require('../models/Category');
const Cart = require('../models/Cart');
const { success, error, notFound } = require('../utils/response');
const { withLock } = require('../utils/redisLock');

/**
 * 生成唯一订单号
 * 格式：ORD + 年月日 + 4位随机数，如 ORD202410020001
 * 说明：毕业设计场景下足够唯一；生产环境建议使用 UUID 或 Snowflake。
 */
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

/**
 * 创建订单（单商品直接购买）
 * 前置校验：商品存在、上架中、库存充足
 * 事务外处理：下单即锁定库存，扣减 stock，累加 sales
 */
exports.createOrder = async (req, res) => {
  try {
    const { product_id, quantity = 1, remark, receiver_name, receiver_phone, receiver_address } = req.body;
    const { user } = req;

    if (!user) {
      return error(res, '请先登录', 401);
    }

    // 验证商品是否存在
    const product = await Product.findByPk(product_id);
    if (!product) {
      return error(res, '商品不存在', 400);
    }

    if (product.status !== 'active') {
      return error(res, '商品已下架', 400);
    }

    const qty = parseInt(quantity);
    if (qty < 1) {
      return error(res, '购买数量不能小于1', 400);
    }

    if (product.stock < qty) {
      return error(res, '商品库存不足', 400);
    }

    // 分布式锁（按商品维度）+ 事务：多实例部署下串行化同一商品的扣减；
    // Redis 未启用时 withLock 自动降级为直接执行，单库仍由原子 SQL 保证不超卖
    const order = await withLock(`product:${product_id}`, () => sequelize.transaction(async (t) => {
      // 原子扣减：WHERE stock >= qty 保证并发请求不会把库存扣成负数
      const [result] = await sequelize.query(
        'UPDATE products SET stock = stock - ?, sales = sales + ?, updated_at = NOW() WHERE id = ? AND status = ? AND stock >= ?',
        { replacements: [qty, qty, product_id, 'active', qty], transaction: t }
      );

      if (!result || result.affectedRows === 0) {
        const stockErr = new Error('商品库存不足');
        stockErr.code = 'STOCK_NOT_ENOUGH';
        throw stockErr;
      }

      return Order.create({
        order_no: generateOrderNo(),
        user_id: user.id,
        product_id,
        quantity: qty,
        total_price: Number((Number(product.price) * qty).toFixed(2)),
        status: 'pending',
        remark,
        receiver_name,
        receiver_phone,
        receiver_address
      }, { transaction: t });
    }));

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
    if (err.code === 'STOCK_NOT_ENOUGH') {
      return error(res, '商品库存不足', 400);
    }
    if (err.code === 'LOCK_BUSY') {
      return error(res, err.message, 429);
    }
    console.error('创建订单失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

/**
 * 批量下单（购物车结算）
 * 使用数据库事务（transaction）保证原子性：
 *   - 所有订单创建成功 + 库存扣减成功 → 提交；
 *   - 任一失败 → 全部回滚，避免超卖。
 * 结算完成后自动删除对应购物车项（cart_ids）。
 */
exports.batchCreateOrders = async (req, res) => {
  try {
    const { items, cart_ids = [], remark, receiver_name, receiver_phone, receiver_address } = req.body;
    const { user } = req;

    if (!user) {
      return error(res, '请先登录', 401);
    }

    if (!Array.isArray(items) || items.length === 0) {
      return error(res, '下单商品不能为空', 400);
    }

    if (!receiver_name || !receiver_phone || !receiver_address) {
      return error(res, '请填写完整的收货人信息', 400);
    }

    // 校验所有商品与库存
    const productIds = items.map(i => parseInt(i.product_id));
    const products = await Product.findAll({ where: { id: productIds } });
    const productMap = new Map(products.map(p => [p.id, p]));

    for (const item of items) {
      const product = productMap.get(parseInt(item.product_id));
      const qty = parseInt(item.quantity) || 1;
      if (!product) {
        return error(res, `商品(ID:${item.product_id})不存在`, 400);
      }
      if (product.status !== 'active') {
        return error(res, `商品「${product.name}」已下架`, 400);
      }
      if (product.stock < qty) {
        return error(res, `商品「${product.name}」库存不足`, 400);
      }
    }

    // 分布式锁（按用户维度）：防止同一用户并发重复结算；
    // Redis 未启用时 withLock 自动降级为直接执行，单库仍由原子 SQL 保证不超卖
    const orders = await withLock(`checkout:${user.id}`, () => sequelize.transaction(async (t) => {
      const created = [];
      for (const item of items) {
        const product = productMap.get(parseInt(item.product_id));
        const qty = parseInt(item.quantity) || 1;

        // 原子扣减库存：并发下不会超卖；事务内任一商品失败则整体回滚
        const [result] = await sequelize.query(
          'UPDATE products SET stock = stock - ?, sales = sales + ?, updated_at = NOW() WHERE id = ? AND status = ? AND stock >= ?',
          { replacements: [qty, qty, product.id, 'active', qty], transaction: t }
        );
        if (!result || result.affectedRows === 0) {
          const stockErr = new Error('商品库存不足');
          stockErr.code = 'STOCK_NOT_ENOUGH';
          stockErr.productName = product.name;
          throw stockErr;
        }

        const order = await Order.create({
          order_no: generateOrderNo(),
          user_id: user.id,
          product_id: product.id,
          quantity: qty,
          total_price: Number((Number(product.price) * qty).toFixed(2)),
          status: 'pending',
          remark,
          receiver_name,
          receiver_phone,
          receiver_address
        }, { transaction: t });

        created.push(order);
      }

      // 删除已结算的购物车项
      if (Array.isArray(cart_ids) && cart_ids.length > 0) {
        await Cart.destroy({
          where: { id: cart_ids, user_id: user.id },
          transaction: t
        });
      }

      return created;
    }));

    return success(res, { orders }, '下单成功', 201);
  } catch (err) {
    if (err.code === 'STOCK_NOT_ENOUGH') {
      return error(res, `商品「${err.productName || ''}」库存不足`, 400);
    }
    if (err.code === 'LOCK_BUSY') {
      return error(res, err.message, 429);
    }
    console.error('批量下单失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

/**
 * 模拟支付接口
 * 将订单状态由 pending 更新为 paid，仅允许本人操作。
 * 毕业设计场景省略真实支付网关（微信/支付宝）对接。
 */
exports.payOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const order = await Order.findOne({ where: { id, user_id: user.id } });
    if (!order) {
      return notFound(res, '订单不存在');
    }

    // 条件更新：仅当仍为「待支付」时才生效，避免并发重复支付
    const [affected] = await Order.update(
      { status: 'paid' },
      { where: { id, user_id: user.id, status: 'pending' } }
    );
    if (affected === 0) {
      return error(res, '订单当前状态不可支付', 400);
    }

    await order.reload();
    return success(res, order, '支付成功');
  } catch (err) {
    console.error('支付失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

/**
 * 确认收货
 * 用户端点击“确认收货”后将 shipped 状态流转到 completed，此后可评价和申请售后。
 */
exports.confirmOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const order = await Order.findOne({ where: { id, user_id: user.id } });
    if (!order) {
      return notFound(res, '订单不存在');
    }

    // 条件更新：仅当仍为「已发货」时才生效，避免并发重复确认
    const [affected] = await Order.update(
      { status: 'completed' },
      { where: { id, user_id: user.id, status: 'shipped' } }
    );
    if (affected === 0) {
      return error(res, '订单尚未发货，无法确认收货', 400);
    }

    await order.reload();
    return success(res, order, '已确认收货');
  } catch (err) {
    console.error('确认收货失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

/**
 * 取消订单
 * 仅 pending（待支付）状态的订单可取消；
 * 取消后自动回补商品库存、扣减对应销量，保证数据一致性。
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const order = await Order.findOne({ where: { id, user_id: user.id } });
    if (!order) {
      return notFound(res, '订单不存在');
    }

    // 条件更新：仅「待支付」订单可取消。
    // 并发/重复请求下只有一个能更新成功（affected === 1），库存因此只回补一次
    const [affected] = await Order.update(
      { status: 'cancelled' },
      { where: { id, user_id: user.id, status: 'pending' } }
    );
    if (affected === 0) {
      return error(res, '仅待支付订单可以取消', 400);
    }

    // 原子回补库存与销量（销量不低于 0）
    await sequelize.query(
      'UPDATE products SET stock = stock + ?, sales = GREATEST(sales - ?, 0), updated_at = NOW() WHERE id = ?',
      { replacements: [order.quantity, order.quantity, order.product_id] }
    );

    await order.reload();
    return success(res, order, '订单已取消');
  } catch (err) {
    console.error('取消订单失败:', err);
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
    const validStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
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
