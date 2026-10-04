import api from './index'

// 用户注册
export const register = (userData) => api.post('/auth/register', userData)

// 用户登录
export const login = (credentials) => api.post('/auth/login', credentials)

// 获取当前登录用户信息
export const getProfile = () => api.get('/auth/profile')

// 退出登录
export const logout = () => api.post('/auth/logout')
