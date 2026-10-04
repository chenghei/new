import api from './index'

// 商品列表：支持分页、分类、关键词、价格区间、排序
// params: { page, limit, category_id, keyword, price_min, price_max, sortBy, order }
export const getProducts = (params = {}) => api.get('/products', { params })

// 商品详情（登录后会记录浏览历史，用于 AI 推荐）
export const getProductById = (id) => api.get(`/products/${id}`)

// 图片上传（用于头像等，返回上传后的文件名）
export const uploadImg = (data) =>
  api.post('/products/upload', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
