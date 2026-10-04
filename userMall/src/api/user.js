import api from './index'

// 更新用户信息（昵称 / 头像 / 手机号）
export const updateUser = (id, userData) => api.put(`/users/${id}`, userData)

// 修改密码
export const updatePassword = (id, data) => api.put(`/users/${id}/password`, data)

// 实名认证（上传真实姓名 + 身份证号）
export const verifyIdentity = (id, data) => api.put(`/users/${id}/identity`, data)
