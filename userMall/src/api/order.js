import api from './index'

// 订单列表：params { page, limit, status }
export const getOrders = (params = {}) => api.get('/orders', { params })

// 订单统计（各状态数量）
export const getOrderStatistics = () => api.get('/orders/statistics')

// 订单详情
export const getOrderById = (id) => api.get(`/orders/${id}`)

// 单商品下单 { product_id, quantity, receiver_name, receiver_phone, receiver_address, remark }
export const createOrder = (data) => api.post('/orders', data)

// 购物车批量结算 { items:[{product_id,quantity}], cart_ids, receiver_name, receiver_phone, receiver_address, remark }
export const batchCreateOrders = (data) => api.post('/orders/batch', data)

// 模拟支付
export const payOrder = (id) => api.post(`/orders/${id}/pay`)

// 确认收货
export const confirmOrder = (id) => api.post(`/orders/${id}/confirm`)

// 取消订单（仅待支付可取消）
export const cancelOrder = (id) => api.post(`/orders/${id}/cancel`)
