import { defineStore } from 'pinia'
import { getMyShop } from '@/api/shop'

// 店铺状态：入驻申请 / 审核状态 / 店铺信息，供路由守卫与页面共享
export const useShopStore = defineStore('shop', {
  state: () => ({
    shop: null,
    loaded: false
  }),

  getters: {
    hasShop: (state) => !!state.shop,
    status: (state) => state.shop?.status || null,
    // 只有审核通过的店铺才能使用后台管理功能
    isApproved: (state) => state.shop?.status === 'approved',
    shopName: (state) => state.shop?.shop_name || ''
  },

  actions: {
    async loadShop() {
      try {
        const res = await getMyShop()
        this.shop = res.data || null
      } catch (error) {
        this.shop = null
      } finally {
        this.loaded = true
      }
      return this.shop
    },

    setShop(shop) {
      this.shop = shop
      this.loaded = true
    },

    clear() {
      this.shop = null
      this.loaded = false
    }
  }
})
