/**
 * 浏览历史模型（BrowseHistory）—— 本次新增
 * ------------------------------------------------------------------
 * 对应数据表：browse_histories
 * 职责：记录登录用户浏览过哪些商品，主要用途：
 *   1. 用户端“我的足迹/浏览记录”页面；
 *   2. 作为 AI 购物助手的输入数据 —— 结合收藏、购买行为，
 *      让 DeepSeek 大模型分析用户偏好并给出个性化推荐。
 *
 * 约束：
 *   (user_id, product_id) 联合唯一索引 —— 同一用户浏览同一商品只保留一条，
 *   重复浏览时仅更新时间戳（upsert）。
 *
 * 关联：
 *   belongsTo User    （浏览者，别名 user）
 *   belongsTo Product （被浏览的商品，别名 product）
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Product = require('./Product');

const BrowseHistory = sequelize.define('BrowseHistory', {
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
  tableName: 'browse_histories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      // 联合唯一索引：同一用户浏览同一商品只保留一条记录（重复浏览时更新时间）
      unique: true,
      fields: ['user_id', 'product_id']
    }
  ]
});

// 建立关联关系
BrowseHistory.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

BrowseHistory.belongsTo(Product, {
  foreignKey: 'product_id',
  as: 'product'
});

User.hasMany(BrowseHistory, {
  foreignKey: 'user_id',
  as: 'browseHistories'
});

Product.hasMany(BrowseHistory, {
  foreignKey: 'product_id',
  as: 'browseHistories'
});

module.exports = BrowseHistory;
