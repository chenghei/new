import api from './index'

// 用户注册
export const register = (userData) => {
  return api.post('/auth/register', userData)
}

// 用户登录
export const login = (credentials) => {
  return api.post('/auth/login', credentials)
}

// 获取用户信息
export const getProfile = () => {
  return api.get('/auth/profile')
}

// 用户登出
export const logout = () => {
  return api.post('/auth/logout')
}