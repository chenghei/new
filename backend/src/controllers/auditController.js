/**
 * 平台审核控制器（auditController）—— 本次新增
 * ------------------------------------------------------------------
 * 仅管理员可用（路由层挂 requireAdmin），支撑商家端两项审核流程：
 *   店铺审核：getShops / auditShop
 *     - 商家提交入驻申请后，管理员审核通过（账号提升为 merchant）或拒绝（附原因）
 *   商品审核：getAuditProducts / auditProduct
 *     - 商家新建或修改商品后进入待审核，管理员审核通过/拒绝（附审核意见）
 *
 * 说明：商家后台只负责“提交/查看审核状态”，审核动作由管理员在管理端完成；
 *       这里提供后端接口，便于后续在管理端接入审核页面。
 */
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const User = require('../models/User');
const Category = require('../models/Category');
const { success, error, notFound } = require('../utils/response');

/* ============================ 店铺审核 ============================ */

// 店铺列表（可按审核状态筛选）
exports.getShops = async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const shops = await Shop.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'nickname', 'email', 'phone'] }],
      order: [['created_at', 'DESC']]
    });

    return success(res, shops, '获取店铺列表成功');
  } catch (err) {
    console.error('获取店铺列表失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 审核店铺：approved 通过 / rejected 拒绝
exports.auditShop = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reject_reason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return error(res, '审核状态不合法', 400);
    }

    const shop = await Shop.findByPk(id);
    if (!shop) return notFound(res, '店铺不存在');

    await shop.update({
      status,
      reject_reason: status === 'rejected' ? reject_reason || '资质信息不符合要求' : null
    });

    // 审核通过后，将账号角色提升为商家
    if (status === 'approved') {
      const user = await User.findByPk(shop.user_id);
      if (user && user.role !== 'admin') {
        await user.update({ role: 'merchant' });
      }
    }

    return success(res, shop, status === 'approved' ? '店铺审核通过' : '店铺审核已拒绝');
  } catch (err) {
    console.error('审核店铺失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

/* ============================ 商品审核 ============================ */

// 商品审核列表（默认待审核）
exports.getAuditProducts = async (req, res) => {
  try {
    const { audit_status = 'pending', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      where: { audit_status },
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        { model: User, as: 'merchant', attributes: ['id', 'username', 'nickname'] }
      ],
      order: [['updated_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return success(
      res,
      {
        products: rows,
        pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) }
      },
      '获取商品审核列表成功'
    );
  } catch (err) {
    console.error('获取商品审核列表失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 审核商品：approved 通过 / rejected 拒绝
exports.auditProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { audit_status, audit_remark } = req.body;

    if (!['approved', 'rejected'].includes(audit_status)) {
      return error(res, '审核状态不合法', 400);
    }

    const product = await Product.findByPk(id);
    if (!product) return notFound(res, '商品不存在');

    await product.update({
      audit_status,
      audit_remark: audit_status === 'rejected' ? audit_remark || '商品信息不符合规范' : null
    });

    return success(res, product, audit_status === 'approved' ? '商品审核通过' : '商品审核已拒绝');
  } catch (err) {
    console.error('审核商品失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};
