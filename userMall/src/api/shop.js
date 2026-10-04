import api from './index'

// 商家（店铺）列表：仅返回已通过审核的店铺，含在售商品数；支持按店铺名称搜索
export const getShops = (params) => api.get('/shops', { params })
