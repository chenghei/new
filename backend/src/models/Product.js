/**
 * 商品模型（Product）
 * ------------------------------------------------------------------
 * 对应数据表：products
 * 职责：保存商户发布的商品信息，供用户端浏览、搜索、下单。
 *
 * 本次为用户端需求新增/确认的字段：
 *   description 商品详情描述（用户端详情页展示）
 *   stock       库存（下单时扣减，取消订单时回补）
 *   sales       销量（下单成功累加，用于列表“按销量排序”）
 *
 * 关联：
 *   belongsTo Category（商品所属分类，别名 category）
 *   belongsTo User    （发布商品的商户，别名 merchant）
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Category = require('./Category');
const User = require('./User');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100],
      notEmpty: true
    }
  },
  image: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // 商品详情描述：用户端商品详情页展示的长文本
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // 库存数量：下单成功时扣减，订单取消时回补，不允许为负
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    validate: {
      min: 0
    }
  },
  // 累计销量：下单成功时累加，用于商城列表“按销量排序”
  sales: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  },
  // 审核状态：pending 待审核 / approved 已通过 / rejected 已拒绝
  // 说明：默认 approved 以兼容存量商品；商家新建或修改商品时会置为 pending，
  //       需管理员在后台审核通过后才会在商城前台展示。
  audit_status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'approved'
  },
  // 审核意见：审核拒绝时由管理员填写，商家据此修改后重新提交
  audit_remark: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Category,
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
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
  }
}, {
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 建立关联关系
Product.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'category'
});

Category.hasMany(Product, {
  foreignKey: 'category_id',
  as: 'products'
});

Product.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'merchant'
});

User.hasMany(Product, {
  foreignKey: 'user_id',
  as: 'products'
});

module.exports = Product;