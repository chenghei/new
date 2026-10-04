import api from './index'

// 我的售后申请列表
export const getMyAfterSales = () => api.get('/after-sales/mine')

// 售后详情
export const getAfterSaleById = (id) => api.get(`/after-sales/${id}`)

// 申请售后 { order_id, type: 'refund' | 'return', reason }
export const applyAfterSale = (data) => api.post('/after-sales', data)

// 撤销售后申请（仅待处理）
export const cancelAfterSale = (id) => api.put(`/after-sales/${id}/cancel`)
