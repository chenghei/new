import api from './index'

// 管理员登录 / 获取当前用户 / 退出
export const login = (credentials) => api.post('/auth/login', credentials)
export const getProfile = () => api.get('/auth/profile')
export const logout = () => api.post('/auth/logout')
