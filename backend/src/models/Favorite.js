/**
 * 收藏模型（Favorite）—— 本次新增
 * ------------------------------------------------------------------
 * 对应数据表：favorites
 * 职责：记录用户收藏的商品，支撑用户端“我的收藏”功能；
 *       同时作为 AI 购物助手分析用户偏好的行为数据之一。
 *
 * 约束：
 *   (user_id, product_id) 联合唯一索引 —— 同一用户不能重复收藏同一商品。
 *
 * 关联：
 *   belongsTo User    （收藏者，别名 user）
 *   belongsTo Product （被收藏的商品，别名 product）
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Product = require('./Product');

const Favorite = sequelize.define('Favorite', {
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
  }
}, {
  tableName: 'favorites',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      // 联合唯一索引：防止同一用户重复收藏同一商品
      unique: true,
      fields: ['user_id', 'product_id']
    }
  ]
});

// 建立关联关系
Favorite.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

Favorite.belongsTo(Product, {
  foreignKey: 'product_id',
  as: 'product'
});

User.hasMany(Favorite, {
  foreignKey: 'user_id',
  as: 'favorites'
});

Product.hasMany(Favorite, {
  foreignKey: 'product_id',
  as: 'favorites'
});

module.exports = Favorite;
