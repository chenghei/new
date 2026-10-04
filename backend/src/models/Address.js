/**
 * 收货地址模型（Address）—— 用户端新增
 * ------------------------------------------------------------------
 * 对应数据表：addresses
 * 职责：保存用户的收货地址簿，支撑用户端「个人中心 - 收货地址管理」，
 *       并在下单结算时自动带出默认地址，减少重复填写。
 *
 * 约束：同一用户默认地址唯一（由业务层保证：设置默认时清除其他默认）。
 *
 * 关联：
 *   belongsTo User（地址所属用户，别名 user）
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Address = sequelize.define('Address', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  // 收货人姓名
  receiver_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  // 收货人手机号
  receiver_phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  // 省市区（如：上海市 徐汇区）
  region: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  // 详细地址
  detail_address: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  // 地址标签：家 / 公司 / 学校
  tag: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '家'
  },
  // 是否默认地址
  is_default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'addresses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

Address.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasMany(Address, {
  foreignKey: 'user_id',
  as: 'addresses'
});

module.exports = Address;
