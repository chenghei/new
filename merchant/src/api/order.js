import api from './index'

// 订单列表（商家角色会返回自己商品相关的订单）
export const getOrders = (params = {}) => api.get('/orders', { params })

// 订单详情
export const getOrderById = (id) => api.get(`/orders/${id}`)

// 更新订单状态（商家发货：{ status: 'shipped' }）
export const updateOrderStatus = (id, data) => api.put(`/orders/${id}`, data)
