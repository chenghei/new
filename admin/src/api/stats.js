import api from './index'

// 平台数据概览
export const getStats = () => api.get('/admin/stats')

// 近 N 天销售趋势
export const getSalesTrend = (days = 7) => api.get('/admin/sales-trend', { params: { days } })

// 近 N 天用户增长趋势
export const getUserGrowth = (days = 7) => api.get('/admin/user-growth', { params: { days } })

// 订单状态分布
export const getOrderStatus = () => api.get('/admin/order-status')

// 商品分类分布
export const getCategoryDistribution = () => api.get('/admin/category-distribution')

// 最近订单
export const getRecentOrders = (limit = 8) => api.get('/admin/recent-orders', { params: { limit } })
