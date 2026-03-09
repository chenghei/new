import api from './index'

// 获取商城统计数据
export const getDashboardStats = () => {
  return api.get('/dashboard/stats')
}

// 获取最近订单列表
export const getRecentOrders = (params) => {
  return api.get('/dashboard/recent-orders', { params })
}
