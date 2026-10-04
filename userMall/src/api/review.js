import api from './index'

// 商品评价列表（公开）：返回 { reviews, avgRating, total, pagination }
export const getProductReviews = (productId, params = {}) =>
  api.get(`/reviews/product/${productId}`, { params })

// 我的评价列表
export const getMyReviews = () => api.get('/reviews/mine')

// 检查订单是否已评价
export const checkReviewed = (orderId) => api.get(`/reviews/check/${orderId}`)

// 创建评价 { order_id, rating, content }
export const createReview = (data) => api.post('/reviews', data)
