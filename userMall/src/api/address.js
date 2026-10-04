import api from './index'

// 我的收货地址列表
export const getAddresses = () => api.get('/addresses')

// 新增收货地址
export const createAddress = (data) => api.post('/addresses', data)

// 编辑收货地址
export const updateAddress = (id, data) => api.put(`/addresses/${id}`, data)

// 删除收货地址
export const deleteAddress = (id) => api.delete(`/addresses/${id}`)

// 设为默认地址
export const setDefaultAddress = (id) => api.put(`/addresses/${id}/default`)
