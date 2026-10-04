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
    isVerified: (state) => !!state.user?.id_verified,
    displayName: (state) => state.user?.nickname || state.user?.username || ''
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
        localStorage.setItem('token', token)

        ElMessage.success('注册成功')
        return response
      } catch (error) {
        this.clearAuth()
        throw error
      }
    },

    // 退出登录
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

    // 校验登录状态（应用启动 / 刷新时调用）
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

    // 局部更新用户信息（资料保存 / 实名认证后同步）
    updateUserInfo(userData) {
      if (this.user) {
        this.user = { ...this.user, ...userData }
      }
    }
  }
})
