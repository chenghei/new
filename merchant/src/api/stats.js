import api from './index'

// 店铺运营概览
export const getStats = () => api.get('/merchant/stats')

// 近 N 天销售趋势
export const getSalesTrend = (days = 7) => api.get('/merchant/sales-trend', { params: { days } })

// 订单状态分布
export const getOrderStatusDistribution = () => api.get('/merchant/order-status')

// 评价星级分布
export const getReviewRatingDistribution = () => api.get('/merchant/review-rating')

// 热销商品 TOP
export const getTopProducts = (limit = 5) => api.get('/merchant/top-products', { params: { limit } })
