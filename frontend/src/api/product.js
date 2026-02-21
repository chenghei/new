import api from './index'

// 获取商品列表（支持分页、分类和名称查询）
export const getProducts = async (params = {}) => {
  return await api.get('/products', { params })
}

// 获取单个商品
export const getProductById = async (id) => {
  return await api.get(`/products/${id}`)
}

// 创建商品
export const createProduct = async (data) => {

  return await api.post('/products', data)
}

// 更新商品
export const updateProduct = async (id, data) => {

  return await api.put(`/products/${id}`, data)
}

// 删除商品
export const deleteProduct = async (id) => {
  return await api.delete(`/products/${id}`)
}

// 上传图片
export const uploadImg = async (data) => {
  // 如果是FormData对象，不设置Content-Type，让浏览器自动设置
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }
  return await api.post(`/products/upload`, data, config)
}