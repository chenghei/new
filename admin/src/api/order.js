import api from './index'

// 平台订单列表：params { page, limit, status }
export const getOrders = (params = {}) => api.get('/orders', { params })

// 订单详情
export const getOrderById = (id) => api.get(`/orders/${id}`)

// 修改订单状态（管理员监管）：{ status, remark }
export const updateOrderStatus = (id, data) => api.put(`/orders/${id}`, data)
