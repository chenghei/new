import api from './index'

// 获取分类列表（支持排序）
export const getCategories = async (params = {}) => {
  return await api.get('/categories', { params })
}

// 获取单个分类
export const getCategoryById = async (id) => {
  return await api.get(`/categories/${id}`)
}

// 创建分类
export const createCategory = async (data) => {
  return await api.post('/categories', data)
}

// 更新分类
export const updateCategory = async (id, data) => {
  return await api.put(`/categories/${id}`, data)
}

// 删除分类
export const deleteCategory = async (id) => {
  return await api.delete(`/categories/${id}`)
}