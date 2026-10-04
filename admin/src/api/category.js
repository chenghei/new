import api from './index'

// 分类列表（后端返回字段名为 users）
export const getCategories = (params = { limit: 100, sortBy: 'sort', order: 'asc' }) =>
  api.get('/categories', { params })

// 新增分类
export const createCategory = (data) => api.post('/categories', data)

// 修改分类（含启用/禁用：status: active | inactive）
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data)

// 删除分类
export const deleteCategory = (id) => api.delete(`/categories/${id}`)
