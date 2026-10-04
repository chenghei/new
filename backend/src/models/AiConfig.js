/**
 * AI 服务配置模型（AiConfig）—— 管理员端新增
 * ------------------------------------------------------------------
 * 对应数据表：ai_configs
 * 职责：保存平台 AI 服务的可配置项，供管理员端「AI服务配置」页面维护。
 *       全表仅使用 id=1 的单行记录（单例配置）。
 *
 * 说明：api_key 为空时回退使用 .env 中的 DEEPSEEK_API_KEY，
 *       前端展示时对密钥做脱敏处理。
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AiConfig = sequelize.define('AiConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // DeepSeek 接口密钥
  api_key: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // 接口地址
  base_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // 模型名称
  model: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  // 采样温度
  temperature: {
    type: DataTypes.FLOAT,
    defaultValue: 0.7
  },
  // 单次最大生成 token
  max_tokens: {
    type: DataTypes.INTEGER,
    defaultValue: 2000
  },
  // AI 服务总开关
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // 最近一次修改人
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'ai_configs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = AiConfig;
