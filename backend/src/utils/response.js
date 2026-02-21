// 统一响应格式工具

const success = (res, data = null, message = '操作成功', status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

const error = (res, message = '操作失败', status = 400, errors = null) => {
  return res.status(status).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString()
  });
};

const notFound = (res, message = '资源不存在') => {
  return error(res, message, 404);
};

const unauthorized = (res, message = '未授权访问') => {
  return error(res, message, 401);
};

const forbidden = (res, message = '访问被拒绝') => {
  return error(res, message, 403);
};

const serverError = (res, message = '服务器内部错误') => {
  return error(res, message, 500);
};

module.exports = {
  success,
  error,
  notFound,
  unauthorized,
  forbidden,
  serverError
};