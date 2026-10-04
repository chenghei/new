/**
 * 收货地址控制器（addressController）—— 用户端新增
 * ------------------------------------------------------------------
 * 提供用户端「个人中心 - 收货地址」相关接口，均需登录：
 *   getAddresses    GET    /api/addresses            我的地址列表（默认地址置顶）
 *   createAddress   POST   /api/addresses            新增地址
 *   updateAddress   PUT    /api/addresses/:id        编辑地址
 *   deleteAddress   DELETE /api/addresses/:id        删除地址
 *   setDefault      PUT    /api/addresses/:id/default 设为默认地址
 *
 * 业务规则：
 *   - 每位用户最多保留一个默认地址；
 *   - 第一条地址自动成为默认地址；
 *   - 删除默认地址后，自动把剩余的第一条设为默认。
 */
const Address = require('../models/Address');
const { success, error, notFound } = require('../utils/response');

// 清除该用户的默认标记
const clearDefault = async (userId, exceptId = null) => {
  const where = { user_id: userId, is_default: true };
  if (exceptId) where.id = { [require('sequelize').Op.ne]: exceptId };
  await Address.update({ is_default: false }, { where });
};

// 我的地址列表
exports.getAddresses = async (req, res) => {
  try {
    const list = await Address.findAll({
      where: { user_id: req.user.id },
      order: [
        ['is_default', 'DESC'],
        ['updated_at', 'DESC']
      ]
    });
    return success(res, list, '获取地址列表成功');
  } catch (err) {
    console.error('获取地址列表失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 新增地址
exports.createAddress = async (req, res) => {
  try {
    const { receiver_name, receiver_phone, region, detail_address, tag, is_default } = req.body;

    if (!receiver_name || !receiver_phone || !detail_address) {
      return error(res, '收货人、手机号和详细地址不能为空', 400);
    }
    if (!/^1[3-9]\d{9}$/.test(receiver_phone)) {
      return error(res, '请输入正确的手机号', 400);
    }

    const count = await Address.count({ where: { user_id: req.user.id } });
    // 第一条地址自动设为默认
    const shouldDefault = is_default === true || count === 0;

    if (shouldDefault) {
      await clearDefault(req.user.id);
    }

    const address = await Address.create({
      user_id: req.user.id,
      receiver_name,
      receiver_phone,
      region,
      detail_address,
      tag: tag || '家',
      is_default: shouldDefault
    });

    return success(res, address, '新增地址成功', 201);
  } catch (err) {
    console.error('新增地址失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 编辑地址
exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findOne({ where: { id, user_id: req.user.id } });
    if (!address) return notFound(res, '地址不存在');

    const { receiver_name, receiver_phone, region, detail_address, tag, is_default } = req.body;

    if (receiver_phone && !/^1[3-9]\d{9}$/.test(receiver_phone)) {
      return error(res, '请输入正确的手机号', 400);
    }

    if (is_default === true) {
      await clearDefault(req.user.id, address.id);
    }

    await address.update({
      receiver_name: receiver_name !== undefined ? receiver_name : address.receiver_name,
      receiver_phone: receiver_phone !== undefined ? receiver_phone : address.receiver_phone,
      region: region !== undefined ? region : address.region,
      detail_address: detail_address !== undefined ? detail_address : address.detail_address,
      tag: tag !== undefined ? tag : address.tag,
      is_default: is_default !== undefined ? is_default : address.is_default
    });

    return success(res, address, '地址已更新');
  } catch (err) {
    console.error('编辑地址失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 删除地址
exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findOne({ where: { id, user_id: req.user.id } });
    if (!address) return notFound(res, '地址不存在');

    const wasDefault = address.is_default;
    await address.destroy();

    // 删除的是默认地址时，把剩余的第一条提为默认
    if (wasDefault) {
      const next = await Address.findOne({
        where: { user_id: req.user.id },
        order: [['updated_at', 'DESC']]
      });
      if (next) await next.update({ is_default: true });
    }

    return success(res, null, '地址已删除');
  } catch (err) {
    console.error('删除地址失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 设为默认地址
exports.setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findOne({ where: { id, user_id: req.user.id } });
    if (!address) return notFound(res, '地址不存在');

    await clearDefault(req.user.id, address.id);
    await address.update({ is_default: true });

    return success(res, address, '已设为默认地址');
  } catch (err) {
    console.error('设置默认地址失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};
