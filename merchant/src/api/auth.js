import api from './index'

// 登录 / 注册 / 获取当前用户 / 退出（复用平台统一认证接口）
export const login = (credentials) => api.post('/auth/login', credentials)
export const register = (userData) => api.post('/auth/register', userData)
export const getProfile = () => api.get('/auth/profile')
export const logout = () => api.post('/auth/logout')
