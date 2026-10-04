import api from './index'

// AI 调用记录：params { page, limit, scene, status, keyword }
export const getAiLogs = (params = {}) => api.get('/admin/ai/logs', { params })

// 调用记录详情
export const getAiLogDetail = (id) => api.get(`/admin/ai/logs/${id}`)

// 删除调用记录
export const deleteAiLog = (id) => api.delete(`/admin/ai/logs/${id}`)

// AI 生成内容：params { page, limit, scene, keyword }
export const getAiContents = (params = {}) => api.get('/admin/ai/contents', { params })

// AI 服务配置
export const getAiConfig = () => api.get('/admin/ai/config')

// 保存 AI 服务配置
export const updateAiConfig = (data) => api.put('/admin/ai/config', data)

// 测试 AI 服务连通性
export const testAiConfig = (data) => api.post('/admin/ai/config/test', data)
