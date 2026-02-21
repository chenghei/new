import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('@/views/Users.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/categories',
    name: 'Categories',
    component: () => import('@/views/Categories.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/products',
    name: 'Products',
    component: () => import('@/views/Products.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  // 如果用户未认证，尝试检查认证状态
  if (!userStore.isAuthenticated && localStorage.getItem('token')) {
    await userStore.checkAuthStatus()
  }

  // 需要登录的路由
  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    ElMessage.warning('请先登录')
    next('/login')
    return
  }

  // 需要管理员权限的路由
  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    ElMessage.error('权限不足')
    next('/dashboard')
    return
  }

  // 已登录用户访问登录/注册页面，重定向到仪表板
  if (to.meta.requiresGuest && userStore.isAuthenticated) {
    next('/dashboard')
    return
  }

  next()
})

export default router