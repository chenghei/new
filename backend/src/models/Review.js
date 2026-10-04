/**
 * 商品评价模型（Review）—— 本次新增
 * ------------------------------------------------------------------
 * 对应数据表：reviews
 * 职责：记录用户对已购商品的评价（评分 + 文字），在用户端商品详情页展示。
 *
 * 业务规则：
 *   - 必须关联订单（order_id）：只有真实购买过的用户才能评价；
 *   - (user_id, order_id) 联合唯一索引：一个订单只能评价一次；
 *   - rating 取值 1~5 星。
 *
 * 关联：
 *   belongsTo User    （评价者，别名 user）
 *   belongsTo Product （被评价的商品，别名 product）
 *   belongsTo Order   （评价来源的订单，别名 order）
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Product = require('./Product');
const Order = require('./Order');

const Review = sequelize.define('Review', {
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
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Product,
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
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
  // 评分：1~5 星
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'reviews',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      // 联合唯一索引：同一用户对同一订单只能评价一次
      unique: true,
      fields: ['user_id', 'order_id']
    }
  ]
});

// 建立关联关系
Review.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

Review.belongsTo(Product, {
  foreignKey: 'product_id',
  as: 'product'
});

Review.belongsTo(Order, {
  foreignKey: 'order_id',
  as: 'order'
});

User.hasMany(Review, {
  foreignKey: 'user_id',
  as: 'reviews'
});

Product.hasMany(Review, {
  foreignKey: 'product_id',
  as: 'reviews'
});

module.exports = Review;
