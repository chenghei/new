import api from './index'

// AI 个性化推荐：返回 { recommendations:[{ product, reason }], source }
export const getRecommendations = () => api.get('/ai/recommend')

// AI 购物助手对话 { messages:[{ role:'user'|'assistant', content }] }
export const aiChat = (messages) => api.post('/ai/chat', { messages })
