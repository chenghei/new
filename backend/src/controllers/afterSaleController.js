/**
 * 售后控制器（afterSaleController）—— 本次新增
 * ------------------------------------------------------------------
 * 提供“退款/退货”售后相关接口：
 *   applyAfterSale    POST /api/after-sales            用户申请售后
 *   getMyAfterSales   GET  /api/after-sales/my         我的售后申请列表
 *   getAfterSaleById  GET  /api/after-sales/:id        售后详情（本人或管理员可见）
 *   cancelAfterSale   POST /api/after-sales/:id/cancel 用户撤销待处理的申请
 *   processAfterSale  PUT  /api/after-sales/:id/process 管理员/商户处理：同意/拒绝/完成
 *
 * 业务规则：
 *   - 仅 paid/shipped/completed 状态的订单可申请售后；
 *   - 已支付未发货（paid）的订单只能“仅退款”，不能“退货退款”；
 *   - 同一订单存在进行中（pending/approved）的申请时不允许重复提交；
 *   - 售后“完成”时订单置为 cancelled 并回补库存、扣减销量。
 */
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const AfterSale = require('../models/AfterSale');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { success, error } = require('../utils/response');
const { withLock } = require('../utils/redisLock');

// 可申请售后的订单状态
const AFTER_SALE_ALLOWED_STATUS = ['paid', 'shipped', 'completed'];

// 构造带业务状态码的错误，便于在 catch 中直接返回给前端
const bizError = (status, message) => {
  const err = new Error(message);
  err.bizStatus = status;
  return err;
};

// 申请售后（退款/退货）
exports.applyAfterSale = async (req, res) => {
  try {
    const { order_id, type, reason } = req.body;
    const { user } = req;

    if (!order_id || !type || !reason) {
      return error(res, '订单ID、售后类型和原因不能为空', 400);
    }

    if (!['refund', 'return'].includes(type)) {
      return error(res, '售后类型必须是退款或退货', 400);
    }

    // 分布式锁（按订单维度）+ 事务 + 行锁：并发/重复提交时，同一订单的申请会被串行化，
    // 只有第一个请求能创建成功，其余请求会看到「已有进行中的申请」而被拒绝；
    // Redis 未启用时 withLock 自动降级，事务行锁仍可保证单库一致
    const afterSale = await withLock(`aftersale:${order_id}`, () => sequelize.transaction(async (t) => {
      const order = await Order.findOne({
        where: { id: order_id, user_id: user.id },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!order) {
        throw bizError(404, '订单不存在');
      }

      if (!AFTER_SALE_ALLOWED_STATUS.includes(order.status)) {
        throw bizError(400, '当前订单状态不支持申请售后');
      }

      // 已支付但未发货的订单只能申请退款，不能申请退货
      if (order.status === 'paid' && type === 'return') {
        throw bizError(400, '订单尚未发货，请选择仅退款');
      }

      // 存在进行中的售后申请则不允许重复申请（加锁读，避免并发重复插入）
      const existing = await AfterSale.findOne({
        where: { order_id, status: { [Op.in]: ['pending', 'approved'] } },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (existing) {
        throw bizError(400, '该订单已有进行中的售后申请');
      }

      return AfterSale.create(
        {
          order_id,
          user_id: user.id,
          type,
          reason,
          status: 'pending'
        },
        { transaction: t }
      );
    }));

    return success(res, afterSale, '售后申请已提交，请等待处理', 201);
  } catch (err) {
    if (err.bizStatus) {
      return error(res, err.message, err.bizStatus);
    }
    console.error('申请售后失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 我的售后列表
exports.getMyAfterSales = async (req, res) => {
  try {
    const { user } = req;

    const list = await AfterSale.findAll({
      where: { user_id: user.id },
      include: [
        {
          model: Order,
          as: 'order',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'image', 'price']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return success(res, list, '获取售后列表成功');
  } catch (err) {
    console.error('获取售后列表失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 售后详情
exports.getAfterSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const afterSale = await AfterSale.findByPk(id, {
      include: [
        {
          model: Order,
          as: 'order',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'image', 'price']
            }
          ]
        }
      ]
    });

    if (!afterSale) {
      return error(res, '售后记录不存在', 404);
    }

    if (user.role !== 'admin' && afterSale.user_id !== user.id) {
      return error(res, '无权限查看此售后记录', 403);
    }

    return success(res, afterSale, '获取售后详情成功');
  } catch (err) {
    console.error('获取售后详情失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 撤销售后申请（仅待处理状态可撤销）
exports.cancelAfterSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const afterSale = await AfterSale.findOne({
      where: { id, user_id: user.id }
    });

    if (!afterSale) {
      return error(res, '售后记录不存在', 404);
    }

    if (afterSale.status !== 'pending') {
      return error(res, '只能撤销待处理的售后申请', 400);
    }

    await afterSale.destroy();
    return success(res, null, '售后申请已撤销');
  } catch (err) {
    console.error('撤销售后失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 处理售后（管理员/商户）：同意、拒绝、完成
exports.processAfterSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, handle_remark } = req.body;
    const { user } = req;

    const validStatus = ['approved', 'rejected', 'completed'];
    if (!validStatus.includes(status)) {
      return error(res, '无效的处理状态', 400);
    }

    const afterSale = await AfterSale.findByPk(id, {
      include: [
        {
          model: Order,
          as: 'order',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });

    if (!afterSale) {
      return error(res, '售后记录不存在', 404);
    }

    // 仅管理员或商品所属商户可处理
    const isAdmin = user.role === 'admin';
    const isMerchant = afterSale.order && afterSale.order.product &&
      afterSale.order.product.user_id === user.id;
    if (!isAdmin && !isMerchant) {
      return error(res, '无权限处理此售后', 403);
    }

    await afterSale.update({
      status,
      handle_remark: handle_remark || null
    });

    // 售后完成后，订单标记为已取消并回补库存
    // 条件更新：只有成功把订单从「非已取消」流转为「已取消」的那一次请求才回补库存，
    // 保证并发/重复处理时库存只回补一次（幂等）
    if (status === 'completed' && afterSale.order) {
      const order = afterSale.order;
      const [affected] = await Order.update(
        { status: 'cancelled' },
        { where: { id: order.id, status: { [Op.ne]: 'cancelled' } } }
      );

      if (affected === 1) {
        await sequelize.query(
          'UPDATE products SET stock = stock + ?, sales = GREATEST(sales - ?, 0), updated_at = NOW() WHERE id = ?',
          { replacements: [order.quantity, order.quantity, order.product_id] }
        );
      }
    }

    return success(res, afterSale, '售后处理成功');
  } catch (err) {
    console.error('处理售后失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};
