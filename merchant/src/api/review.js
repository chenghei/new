import api from './index'

// 商家名下商品评价列表：params { page, limit, product_id, rating }
export const getMerchantReviews = (params = {}) => api.get('/merchant/reviews', { params })

// AI 评价分析：body { product_id? }（不传则分析本商家全部商品评价）
export const analyzeReviews = (productId) =>
  api.post('/ai/review-analysis', productId ? { product_id: productId } : {})
