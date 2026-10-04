/**
 * 用户模型（User）
 * ------------------------------------------------------------------
 * 对应数据表：users
 * 职责：保存系统全部账号信息，三种角色共用一张表：
 *   - admin    管理员（后台管理端）
 *   - merchant 商户（发布商品、处理自己商品的订单）
 *   - user     普通用户（userMall 用户端）
 *
 * 本次为用户端需求新增的字段：
 *   phone        手机号（收货、联系用）
 *   real_name    真实姓名（实名认证）
 *   id_card      身份证号（实名认证）
 *   id_verified  是否已完成实名认证
 */
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [6, 255],
      notEmpty: true
    }
  },
  nickname: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // 手机号：用户端注册/收货信息使用，允许为空，注册后可补充
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  // 真实姓名：实名认证时填写
  real_name: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  // 身份证号：实名认证时填写，18 位
  id_card: {
    type: DataTypes.STRING(18),
    allowNull: true
  },
  // 实名认证标记：true 表示已通过认证（毕业设计场景为模拟认证）
  id_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'merchant', 'user'),
    defaultValue: 'user'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

// 实例方法：验证密码
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// 实例方法：转换为安全的JSON对象
User.prototype.toSafeJSON = function() {
  const { password, ...safeUser } = this.toJSON();
  return safeUser;
};

module.exports = User;