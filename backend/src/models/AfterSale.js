/**
 * 售后申请模型（AfterSale）—— 本次新增
 * ------------------------------------------------------------------
 * 对应数据表：after_sales
 * 职责：记录用户针对订单发起的退款/退货申请及商户的处理结果。
 *
 * 售后类型（type）：
 *   refund 仅退款
 *   return 退货退款
 *
 * 处理状态机（status）：
 *   pending   待处理（用户提交申请后的初始状态）
 *   approved  已同意（商户同意，等待退款/退货流程完成）
 *   rejected  已拒绝（商户拒绝申请，handle_remark 中写明原因）
 *   completed 已完成（退款/退货流程结束）
 *
 * 关联：
 *   belongsTo Order （申请售后的订单，别名 order）
 *   belongsTo User  （发起申请的用户，别名 user）
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Order = require('./Order');

const AfterSale = sequelize.define('AfterSale', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Order,
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  // 售后类型：refund 仅退款 / return 退货退款
  type: {
    type: DataTypes.ENUM('refund', 'return'),
    allowNull: false,
    defaultValue: 'refund'
  },
  // 申请原因：用户必填
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  // 处理状态：pending待处理 / approved已同意 / rejected已拒绝 / completed已完成
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed'),
    defaultValue: 'pending'
  },
  // 商户处理备注：同意或拒绝时填写的说明
  handle_remark: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'after_sales',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 建立关联关系
AfterSale.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

AfterSale.belongsTo(Order, {
  foreignKey: 'order_id',
  as: 'order'
});

User.hasMany(AfterSale, {
  foreignKey: 'user_id',
  as: 'afterSales'
});

Order.hasMany(AfterSale, {
  foreignKey: 'order_id',
  as: 'afterSales'
});

module.exports = AfterSale;
