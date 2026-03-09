import api from './index'

// 获取订单列表
export const getOrders = (params) => {
  return api.get('/orders', { params })
}

// 获取订单详情
export const getOrderById = (id) => {
  return api.get(`/orders/${id}`)
}

// 创建订单
export const createOrder = (data) => {
  return api.post('/orders', data)
}

// 更新订单状态
export const updateOrderStatus = (id, data) => {
  return api.put(`/orders/${id}`, data)
}

// 获取订单统计
export const getOrderStatistics = () => {
  return api.get('/orders/statistics')
}
