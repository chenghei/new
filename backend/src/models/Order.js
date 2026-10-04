/**
 * 订单模型（Order）
 * ------------------------------------------------------------------
 * 对应数据表：orders
 * 职责：记录用户购买商品产生的订单，一单对应一种商品（数量可多件）。
 *
 * 订单状态机（本次按用户端需求重新设计）：
 *   pending   待支付（下单成功后的初始状态）
 *   paid      已支付（模拟支付成功，等待商户发货）
 *   shipped   已发货（商户在管理端点击发货）
 *   completed 已完成（用户确认收货，可评价、可申请售后）
 *   cancelled 已取消（用户取消待支付订单，库存自动回补）
 *
 * 本次为用户端需求新增的字段：
 *   receiver_name    收货人姓名
 *   receiver_phone   收货人电话
 *   receiver_address 收货地址
 *
 * 关联：
 *   belongsTo User    （下单用户，别名 user）
 *   belongsTo Product （购买的商品，别名 product）
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Product = require('./Product');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_no: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Product,
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  // 订单状态：pending待支付 / paid已支付 / shipped已发货 / completed已完成 / cancelled已取消
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'shipped', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  // 收货人姓名：下单时由用户填写
  receiver_name: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  // 收货人电话：下单时由用户填写
  receiver_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  // 收货地址：下单时由用户填写
  receiver_address: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 建立关联关系
Order.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

Order.belongsTo(Product, {
  foreignKey: 'product_id',
  as: 'product'
});

User.hasMany(Order, {
  foreignKey: 'user_id',
  as: 'orders'
});

Product.hasMany(Order, {
  foreignKey: 'product_id',
  as: 'orders'
});

module.exports = Order;
