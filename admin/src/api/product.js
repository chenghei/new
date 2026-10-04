import api from './index'

// 全量商品列表（管理员可见全部，含未审核）
// params { page, limit, keyword, category_id, status, sortBy, order }
export const getProducts = (params = {}) => api.get('/products', { params })

// 商品详情
export const getProductById = (id) => api.get(`/products/${id}`)

// 更新商品（含上下架）
export const updateProduct = (id, data) => api.put(`/products/${id}`, data)

// 删除商品
export const deleteProduct = (id) => api.delete(`/products/${id}`)

// 待审核商品列表：params { audit_status, page, limit }
export const getAuditProducts = (params = {}) => api.get('/admin/products', { params })

// 审核商品：{ audit_status: 'approved' | 'rejected', audit_remark }
export const auditProduct = (id, data) => api.put(`/admin/products/${id}/audit`, data)

// 图片上传（返回文件名）
export const uploadImg = (data) =>
  api.post('/products/upload', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
