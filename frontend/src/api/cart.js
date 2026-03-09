import api from './index'

// 获取购物车列表
export const getCartList = () => {
  return api.get('/cart')
}

// 添加商品到购物车
export const addToCart = (data) => {
  return api.post('/cart', data)
}

// 更新购物车商品数量
export const updateCartQuantity = (id, quantity) => {
  return api.put(`/cart/${id}`, { quantity })
}

// 删除购物车商品
export const deleteCartItem = (id) => {
  return api.delete(`/cart/${id}`)
}

// 清空购物车
export const clearCart = () => {
  return api.delete('/cart')
}
