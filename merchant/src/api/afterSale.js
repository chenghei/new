import api from './index'

// 商家名下商品相关的售后申请列表
export const getMerchantAfterSales = (params = {}) => api.get('/merchant/after-sales', { params })

// 处理售后：{ status: 'approved' | 'rejected' | 'completed', handle_remark }
export const processAfterSale = (id, data) => api.put(`/after-sales/${id}/process`, data)
