import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useShopStore } from '@/store/shop'
import { ElMessage } from 'element-plus'

const routes = [
  {
    path: '/',
    component: () => import('@/components/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '数据统计', requiresAuth: true, requiresShop: true }
      },
      {
        path: 'products',
        name: 'Products',
        component: () => import('@/views/Products.vue'),
        meta: { title: '商品管理', requiresAuth: true, requiresShop: true }
      },
      {
        path: 'ai-copy',
        name: 'AiCopy',
        component: () => import('@/views/AiCopy.vue'),
        meta: { title: 'AI商品助手', requiresAuth: true, requiresShop: true }
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/Orders.vue'),
        meta: { title: '订单管理', requiresAuth: true, requiresShop: true }
      },
      {
        path: 'after-sales',
        name: 'AfterSales',
        component: () => import('@/views/AfterSales.vue'),
        meta: { title: '售后管理', requiresAuth: true, requiresShop: true }
      },
      {
        path: 'reviews',
        name: 'Reviews',
        component: () => import('@/views/Reviews.vue'),
        meta: { title: '评论管理', requiresAuth: true, requiresShop: true }
      },
      {
        path: 'shop',
        name: 'Shop',
        component: () => import('@/views/Shop.vue'),
        meta: { title: '店铺管理', requiresAuth: true }
      },
      {
        path: 'apply',
        name: 'Apply',
        component: () => import('@/views/Apply.vue'),
        meta: { title: '商家入驻', requiresAuth: true }
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', requiresGuest: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: '页面不存在' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach(async (to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 商家后台` : '商家后台'

  const userStore = useUserStore()
  const shopStore = useShopStore()

  // 恢复登录态
  if (!userStore.isAuthenticated && localStorage.getItem('token')) {
    await userStore.checkAuthStatus()
  }

  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    ElMessage.warning('请先登录商家账号')
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.requiresGuest && userStore.isAuthenticated) {
    next('/')
    return
  }

  // 登录后确保店铺信息已加载（用于审核状态判断）
  if (userStore.isAuthenticated && !shopStore.loaded) {
    await shopStore.loadShop()
  }

  // 需要“审核通过的店铺”才能使用的功能
  if (to.meta.requiresShop && !shopStore.isApproved) {
    ElMessage.warning('请先完成商家入驻并通过平台审核')
    next('/apply')
    return
  }

  next()
})

export default router
