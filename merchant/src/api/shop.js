import api from './index'

// 我的店铺信息（含审核状态）
export const getMyShop = () => api.get('/merchant/shop')

// 提交入驻申请（含资质信息）
export const applyShop = (data) => api.post('/merchant/shop', data)

// 维护店铺基本信息（被拒后提交会重新进入待审核）
export const updateShop = (data) => api.put('/merchant/shop', data)
