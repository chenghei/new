import api from './index'

// 获取用户列表
export const getUsers = (params) => {
  return api.get('/users', { params })
}

// 获取用户详情
export const getUserById = (id) => {
  return api.get(`/users/${id}`)
}

// 更新用户信息
export const updateUser = (id, userData) => {
  return api.put(`/users/${id}`, userData)
}

// 更新密码
export const updatePassword = (id, passwordData) => {
  return api.put(`/users/${id}/password`, passwordData)
}

// 删除用户
export const deleteUser = (id) => {
  return api.delete(`/users/${id}`)
}

// 切换用户状态
export const toggleUserStatus = (id) => {
  return api.patch(`/users/${id}/status`)
}