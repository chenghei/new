/**
 * AI 调用记录模型（AiLog）—— 管理员端新增
 * ------------------------------------------------------------------
 * 对应数据表：ai_logs
 * 职责：记录每一次 AI 功能的调用，支撑管理员端「AI功能调用记录」与
 *       「AI生成内容管理」两块功能：
 *   - scene 标识调用场景：recommend 个性化推荐 / chat 导购对话 /
 *     product-copy 商品文案生成 / review-analysis 评价分析
 *   - input / output 保存调用入参摘要与模型输出（即 AI 生成内容）
 *   - status / error_message / duration_ms 用于监控 AI 服务健康度
 *
 * 关联：
 *   belongsTo User（调用者，别名 user；用户被删除时置空以保留记录）
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const AiLog = sequelize.define('AiLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  // 调用场景标识
  scene: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  // 调用场景中文名，便于前端直接展示
  scene_name: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  // 入参摘要
  input: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // 模型输出（AI 生成内容）
  output: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // 调用状态
  status: {
    type: DataTypes.ENUM('success', 'failed'),
    defaultValue: 'success'
  },
  // 失败原因
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // 耗时（毫秒）
  duration_ms: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  // 实际使用的模型
  model: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'ai_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

AiLog.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasMany(AiLog, {
  foreignKey: 'user_id',
  as: 'aiLogs'
});

module.exports = AiLog;
