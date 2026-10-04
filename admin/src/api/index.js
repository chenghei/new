import axios from 'axios'
import { ElMessage } from 'element-plus'

// 统一 axios 实例：baseURL=/api，由 vite 代理转发到后端 5000 端口
const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器：自动携带 JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器：统一处理业务错误与 HTTP 错误
api.interceptors.response.use(
  (response) => {
    const { data } = response

    if (Object.prototype.hasOwnProperty.call(data, 'success') && !data.success) {
      ElMessage.error(data.message || '请求失败')
      return Promise.reject(new Error(data.message || '请求失败'))
    }

    return data
  },
  (error) => {
    const { response } = error

    if (response) {
      const { status, data } = response
      const message = data?.message || '请求失败'

      switch (status) {
        case 401:
          localStorage.removeItem('token')
          ElMessage.error(message)
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          break
        case 403:
          ElMessage.error(message)
          break
        case 404:
          ElMessage.error(message)
          break
        case 504:
          ElMessage.error(message || 'AI 响应超时，请稍后再试')
          break
        case 500:
          ElMessage.error(message || '服务器内部错误')
          break
        default:
          ElMessage.error(message)
      }
    } else {
      ElMessage.error('网络错误，请检查网络连接')
    }

    return Promise.reject(error)
  }
)

export default api
