import api from './index'

// 商品列表：scope=mine 只查看本商家商品
// params: { page, limit, keyword, status, category_id, sortBy, order, scope }
export const getProducts = (params = {}) => api.get('/products', { params })

// 商品详情
export const getProductById = (id) => api.get(`/products/${id}`)

// 新增商品（后台会自动进入待审核状态）
export const createProduct = (data) => api.post('/products', data)

// 编辑商品（修改内容后重新进入待审核）
export const updateProduct = (id, data) => api.put(`/products/${id}`, data)

// 仅切换上下架状态（不会触发重新审核）
export const updateProductStatus = (id, status) => api.put(`/products/${id}`, { status })

// 删除商品
export const deleteProduct = (id) => api.delete(`/products/${id}`)

// 图片上传（返回文件名）
export const uploadImg = (data) =>
  api.post('/products/upload', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
