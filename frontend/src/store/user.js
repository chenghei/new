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
    isAdmin: (state) => state.user?.role === 'admin',
    userInfo: (state) => state.user
  },

  actions: {
    // 登录
    async login(credentials) {
      try {
        const response = await loginApi(credentials)
        const { user, token } = response.data

        this.user = user
        this.token = token
        this.isAuthenticated = true

        // 保存token到localStorage
        localStorage.setItem('token', token)

        ElMessage.success('登录成功')
        return response
      } catch (error) {
        this.clearAuth()
        throw error
      }
    },

    // 注册
    async register(userData) {
      try {
        const response = await registerApi(userData)
        const { user, token } = response.data

        this.user = user
        this.token = token
        this.isAuthenticated = true

        // 保存token到localStorage
        localStorage.setItem('token', token)

        ElMessage.success('注册成功')
        return response
      } catch (error) {
        this.clearAuth()
        throw error
      }
    },

    // 登出
    logout() {
      this.clearAuth()
      ElMessage.success('已退出登录')
    },

    // 清除认证信息
    clearAuth() {
      this.user = null
      this.token = null
      this.isAuthenticated = false
      localStorage.removeItem('token')
    },

    // 检查认证状态
    async checkAuthStatus() {
      const token = localStorage.getItem('token')
      if (!token) {
        this.clearAuth()
        return false
      }

      try {
        const response = await getProfile()
        const { user } = response.data

        this.user = user
        this.token = token
        this.isAuthenticated = true
        return true
      } catch (error) {
        this.clearAuth()
        return false
      }
    },

    // 更新用户信息
    updateUserInfo(userData) {
      if (this.user) {
        this.user = { ...this.user, ...userData }
      }
    }
  }
})