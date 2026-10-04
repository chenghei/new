import api from './index'

// 平台售后列表：params { page, limit, status, type, abnormal, keyword }
export const getAfterSales = (params = {}) => api.get('/admin/after-sales', { params })

// 处理售后：{ status: 'approved' | 'rejected' | 'completed', handle_remark }
export const processAfterSale = (id, data) => api.put(`/after-sales/${id}/process`, data)
