const { Sequelize } = require('sequelize');
require('dotenv').config();

// 使用SQLite进行本地测试
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:', // 使用内存数据库进行测试
  logging: false // 关闭日志以简化输出
});

// 测试数据库连接
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('本地测试数据库连接成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
  }
};

module.exports = { sequelize, testConnection };