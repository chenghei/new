import { defineStore } from 'pinia'
import { login as loginApi, register as registerApi, getProfile } from '@/api/auth'
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
      try {
        const response = await loginApi(credentials)
        const { user, token } = response.data
        this.user = user
        this.token = token
        this.isAuthenticated = true
        localStorage.setItem('token', token)
        ElMessage.success('登录成功')
        return response
      } catch (error) {
        this.clearAuth()
        throw error
      }
    },

    async register(userData) {
      try {
        const response = await registerApi(userData)
        const { user, token } = response.data
        this.user = user
        this.token = token
        this.isAuthenticated = true
        localStorage.setItem('token', token)
        ElMessage.success('注册成功')
        return response
      } catch (error) {
        this.clearAuth()
        throw error
      }
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
        this.user = response.data.user
        this.token = token
        this.isAuthenticated = true
        return true
      } catch (error) {
        this.clearAuth()
        return false
      }
    },

    updateUserInfo(userData) {
      if (this.user) {
        this.user = { ...this.user, ...userData }
      }
    }
  }
})
