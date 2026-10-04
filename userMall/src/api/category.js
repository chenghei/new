import api from './index'

// 分类列表（后端返回字段名为 users，按 sort 排序）
export const getCategories = (params = {}) => api.get('/categories', { params })
