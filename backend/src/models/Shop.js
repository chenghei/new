/**
 * 店铺模型（Shop）—— 商家端新增
 * ------------------------------------------------------------------
 * 对应数据表：shops
 * 职责：记录商家入驻申请、资质信息与店铺基本信息，支撑商家端：
 *   - 入驻申请（提交店铺与资质信息）
 *   - 审核状态查询（pending 待审核 / approved 已通过 / rejected 已拒绝）
 *   - 店铺基本信息维护
 *
 * 一个用户（账号）最多拥有一个店铺（user_id 唯一）。
 * 审核通过后，该账号角色会被提升为 merchant，可进入商家后台管理商品与订单。
 *
 * 关联：
 *   belongsTo User（店铺所属账号，别名 user）
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Shop = sequelize.define('Shop', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: User,
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  // 店铺名称
  shop_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [2, 100],
      notEmpty: true
    }
  },
  // 店铺 Logo（图片文件名或完整 URL）
  logo: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // 店铺简介
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // 经营类目（展示用的分类名称，与 category_id 对应的分类保持一致）
  business_category: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  // 经营类目（关联管理员在「分类管理」中维护的商品分类）
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  // 联系人姓名
  contact_name: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  // 联系人电话
  contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  // 营业执照编号
  business_license: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  // 资质证件图片（图片文件名或完整 URL）
  license_image: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // 店铺所在地
  address: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // 审核状态：pending 待审核 / approved 已通过 / rejected 已拒绝
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  // 审核拒绝原因（status=rejected 时有值）
  reject_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'shops',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 建立关联关系
Shop.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasOne(Shop, {
  foreignKey: 'user_id',
  as: 'shop'
});

module.exports = Shop;
