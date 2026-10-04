import { defineStore } from 'pinia'
import { getCartList } from '@/api/cart'

// 购物车状态：用于顶栏角标数量、结算时携带已选商品
export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    // 结算页要购买的商品（结算车）项：{ product_id, quantity, cart_id }
    checkoutItems: []
  }),

  getters: {
    // 顶栏角标：购物车商品种类数
    count: (state) => state.items.length,
    // 购物车内商品总件数
    totalQuantity: (state) => state.items.reduce((sum, i) => sum + (i.quantity || 0), 0)
  },

  actions: {
    // 拉取购物车（失败静默处理，未登录时后端返回 401）
    async loadCart() {
      try {
        const response = await getCartList()
        this.items = response.data || []
      } catch (error) {
        this.items = []
      }
      return this.items
    },

    clear() {
      this.items = []
      this.checkoutItems = []
    },

    // 立即购买 / 购物车结算时暂存待结算商品，供 Checkout 页读取
    setCheckoutItems(items) {
      this.checkoutItems = items
    }
  }
})
