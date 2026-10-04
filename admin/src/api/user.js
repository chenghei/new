import api from './index'

// 用户列表：params { page, limit, search, role, status }
export const getUsers = (params = {}) => api.get('/users', { params })

// 切换用户状态（启用/禁用）
export const toggleUserStatus = (id) => api.patch(`/users/${id}/status`)

// 删除用户
export const deleteUser = (id) => api.delete(`/users/${id}`)
