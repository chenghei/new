import api from './index'

// 分类列表（后端返回字段名为 users）
export const getCategories = (params = { limit: 100, sortBy: 'sort', order: 'asc' }) =>
  api.get('/categories', { params })
