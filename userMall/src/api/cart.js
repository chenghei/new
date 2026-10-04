import api from './index'

// 购物车列表
export const getCartList = () => api.get('/cart')

// 加入购物车 { product_id, quantity }
export const addToCart = (data) => api.post('/cart', data)

// 修改购物车商品数量
export const updateCartQuantity = (id, quantity) => api.put(`/cart/${id}`, { quantity })

// 删除购物车商品
export const deleteCartItem = (id) => api.delete(`/cart/${id}`)

// 清空购物车
export const clearCart = () => api.delete('/cart')
