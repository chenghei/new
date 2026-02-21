const Joi = require('joi');

// 用户注册验证规则
const registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.alphanum': '用户名只能包含字母和数字',
      'string.min': '用户名至少3个字符',
      'string.max': '用户名最多50个字符',
      'any.required': '用户名不能为空'
    }),
  email: Joi.string()
    .email()
    .max(100)
    .required()
    .messages({
      'string.email': '邮箱格式不正确',
      'string.max': '邮箱最多100个字符',
      'any.required': '邮箱不能为空'
    }),
  password: Joi.string()
    .min(6)
    .max(50)
    .required()
    .messages({
      'string.min': '密码至少6个字符',
      'string.max': '密码最多50个字符',
      'any.required': '密码不能为空'
    }),
  nickname: Joi.string()
    .max(50)
    .optional()
    .messages({
      'string.max': '昵称最多50个字符'
    })
});

// 用户登录验证规则
const loginSchema = Joi.object({
  username: Joi.string()
    .required()
    .messages({
      'any.required': '用户名/邮箱不能为空'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': '密码不能为空'
    })
});

// 用户更新验证规则
const updateUserSchema = Joi.object({
  nickname: Joi.string()
    .max(50)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': '昵称最多50个字符'
    }),
  avatar: Joi.string()
    .uri()
    .optional()
    .allow(null, '')
    .messages({
      'string.uri': '头像必须是有效的URL'
    }),
  role: Joi.string()
    .valid('admin', 'merchant', 'user')
    .optional()
    .messages({
      'any.only': '角色必须是admin、merchant或user'
    })
});

// 密码更新验证规则
const updatePasswordSchema = Joi.object({
  oldPassword: Joi.string()
    .required()
    .messages({
      'any.required': '旧密码不能为空'
    }),
  newPassword: Joi.string()
    .min(6)
    .max(50)
    .required()
    .messages({
      'string.min': '新密码至少6个字符',
      'string.max': '新密码最多50个字符',
      'any.required': '新密码不能为空'
    })
});

// 验证数据的通用函数
const validate = (schema, data) => {
  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    return { isValid: false, errors };
  }
  
  return { isValid: true, value };
};

module.exports = {
  registerSchema,
  loginSchema,
  updateUserSchema,
  updatePasswordSchema,
  validate
};