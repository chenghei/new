import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/store/user'
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
        meta: { title: '数据统计', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/Users.vue'),
        meta: { title: '用户管理', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'merchants',
        name: 'Merchants',
        component: () => import('@/views/Merchants.vue'),
        meta: { title: '商家管理', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'products',
        name: 'Products',
        component: () => import('@/views/Products.vue'),
        meta: { title: '商品与分类管理', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('@/views/Categories.vue'),
        meta: { title: '分类管理', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/Orders.vue'),
        meta: { title: '订单监管', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'after-sales',
        name: 'AfterSales',
        component: () => import('@/views/AfterSales.vue'),
        meta: { title: '售后监管', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'ai-logs',
        name: 'AiLogs',
        component: () => import('@/views/AiLogs.vue'),
        meta: { title: 'AI调用记录', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'ai-contents',
        name: 'AiContents',
        component: () => import('@/views/AiContents.vue'),
        meta: { title: 'AI生成内容', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'ai-config',
        name: 'AiConfig',
        component: () => import('@/views/AiConfig.vue'),
        meta: { title: 'AI服务配置', requiresAuth: true, requiresAdmin: true }
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
  document.title = to.meta.title ? `${to.meta.title} - 管理后台` : '管理后台'

  const userStore = useUserStore()

  // 恢复登录态
  if (!userStore.isAuthenticated && localStorage.getItem('token')) {
    await userStore.checkAuthStatus()
  }

  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    ElMessage.warning('请先登录管理员账号')
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    ElMessage.error('需要管理员权限')
    userStore.clearAuth()
    next('/login')
    return
  }

  if (to.meta.requiresGuest && userStore.isAuthenticated) {
    next('/')
    return
  }

  next()
})

export default router
