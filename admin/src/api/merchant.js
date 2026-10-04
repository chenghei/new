import api from './index'

// 商家列表（含店铺与资质信息）：params { page, limit, keyword, status, shop_status }
export const getMerchants = (params = {}) => api.get('/admin/merchants', { params })

// 启用 / 禁用商家账号
export const setMerchantStatus = (id, status) =>
  api.patch(`/admin/merchants/${id}/status`, { status })

// 店铺（入驻申请）列表：params { status }
export const getShops = (params = {}) => api.get('/admin/shops', { params })

// 审核店铺：{ status: 'approved' | 'rejected', reject_reason }
export const auditShop = (id, data) => api.put(`/admin/shops/${id}/audit`, data)
