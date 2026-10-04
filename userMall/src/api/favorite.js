import api from './index'

// 我的收藏列表
export const getFavorites = () => api.get('/favorites')

// 收藏 / 取消收藏（开关式）
export const toggleFavorite = (productId) =>
  api.post('/favorites/toggle', { product_id: productId })

// 查询某商品是否已收藏
export const checkFavorite = (productId) => api.get(`/favorites/check/${productId}`)

// 按收藏记录 id 删除
export const removeFavorite = (id) => api.delete(`/favorites/${id}`)
