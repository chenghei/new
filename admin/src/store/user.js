import { defineStore } from 'pinia'
import { login as loginApi, getProfile } from '@/api/auth'
import { ElMessage } from 'element-plus'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false
  }),

  getters: {
    userInfo: (state) => state.user,
    displayName: (state) => state.user?.nickname || state.user?.username || '',
    isAdmin: (state) => state.user?.role === 'admin'
  },

  actions: {
    async login(credentials) {
      const response = await loginApi(credentials)
      const { user, token } = response.data

      // 仅允许管理员登录管理后台
      if (user.role !== 'admin') {
        this.clearAuth()
        ElMessage.error('该账号不是管理员，无法登录管理后台')
        throw new Error('not-admin')
      }

      this.user = user
      this.token = token
      this.isAuthenticated = true
      localStorage.setItem('token', token)
      ElMessage.success('登录成功')
      return response
    },

    logout() {
      this.clearAuth()
      ElMessage.success('已退出登录')
    },

    clearAuth() {
      this.user = null
      this.token = null
      this.isAuthenticated = false
      localStorage.removeItem('token')
    },

    async checkAuthStatus() {
      const token = localStorage.getItem('token')
      if (!token) {
        this.clearAuth()
        return false
      }
      try {
        const response = await getProfile()
        const user = response.data.user
        if (user.role !== 'admin') {
          this.clearAuth()
          return false
        }
        this.user = user
        this.token = token
        this.isAuthenticated = true
        return true
      } catch (error) {
        this.clearAuth()
        return false
      }
    }
  }
})
