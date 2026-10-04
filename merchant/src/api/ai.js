import api from './index'

// AI 商品文案生成：{ name, category, features } → { title, selling_points, description }
export const generateProductCopy = (data) => api.post('/ai/product-copy', data)
