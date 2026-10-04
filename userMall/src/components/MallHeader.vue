<template>
  <header class="mall-header">
    <div class="header-top">
      <div class="container top-inner">
        <span class="welcome">
          {{ userStore.isAuthenticated ? `Hi，${userStore.displayName}` : '欢迎来到优选商城' }}
        </span>
        <div class="top-links">
          <template v-if="userStore.isAuthenticated">
            <router-link to="/orders">我的订单</router-link>
            <span class="divider">|</span>
            <router-link to="/favorites">我的收藏</router-link>
            <span class="divider">|</span>
            <router-link to="/after-sales">退款/售后</router-link>
          </template>
          <template v-else>
            <router-link to="/login">登录</router-link>
            <span class="divider">|</span>
            <router-link to="/register" class="register-link">免费注册</router-link>
            <span class="divider">|</span>
            <a :href="merchantLoginUrl" class="merchant-link" target="_blank" rel="noopener">
              商家入驻
            </a>
          </template>
        </div>
      </div>
    </div>

    <div class="header-main">
      <div class="container main-inner">
        <!-- Logo -->
        <router-link to="/" class="logo">
          <span class="logo-mark">优</span>
          <span class="logo-text">优选商城</span>
        </router-link>

        <!-- 搜索框 -->
        <div class="search-box">
          <el-input
            v-model="keyword"
            placeholder="搜索你想要的好物，如：手机、零食、家居"
            size="large"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #append>
              <el-button type="primary" @click="handleSearch">
                <el-icon><Search /></el-icon>
                搜索
              </el-button>
            </template>
          </el-input>
          <div class="hot-words">
            <span
              v-for="word in hotWords"
              :key="word"
              class="hot-word"
              @click="searchWord(word)"
            >
              {{ word }}
            </span>
          </div>
        </div>

        <!-- 右侧操作区 -->
        <div class="header-actions">
          <router-link to="/cart" class="action-item cart-action">
            <el-badge :value="cartStore.count" :hidden="!cartStore.count" :max="99">
              <el-icon size="22"><ShoppingCart /></el-icon>
            </el-badge>
            <span>购物车</span>
          </router-link>

          <router-link to="/ai-assistant" class="action-item ai-action">
            <el-icon size="22"><MagicStick /></el-icon>
            <span>AI助手</span>
          </router-link>

          <el-dropdown v-if="userStore.isAuthenticated" @command="handleCommand">
            <div class="action-item user-action">
              <el-avatar :size="30" :src="resolveImage(userStore.userInfo?.avatar)">
                <el-icon><User /></el-icon>
              </el-avatar>
              <span class="ellipsis username">{{ userStore.displayName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>个人中心
                </el-dropdown-item>
                <el-dropdown-item command="orders">
                  <el-icon><Document /></el-icon>我的订单
                </el-dropdown-item>
                <el-dropdown-item command="favorites">
                  <el-icon><Star /></el-icon>我的收藏
                </el-dropdown-item>
                <el-dropdown-item command="after-sales">
                  <el-icon><RefreshLeft /></el-icon>退款/售后
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <!-- 导航栏 -->
    <nav class="header-nav">
      <div class="container nav-inner">
        <el-dropdown
          class="category-dropdown"
          trigger="hover"
          @command="goCategory"
        >
          <div class="all-category">
            <el-icon><Menu /></el-icon>
            <span>全部分类</span>
            <el-icon class="arrow"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="cat in categories"
                :key="cat.id"
                :command="cat.id"
              >
                {{ cat.name }}
              </el-dropdown-item>
              <el-dropdown-item v-if="categories.length === 0" disabled>
                暂无分类
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <div class="nav-links">
          <router-link to="/" class="nav-link" :class="{ active: isActive('/') }">首页</router-link>
          <router-link
            to="/products"
            class="nav-link"
            :class="{ active: isActive('/products') }"
          >
            全部商品
          </router-link>
          <router-link
            to="/ai-assistant"
            class="nav-link"
            :class="{ active: isActive('/ai-assistant') }"
          >
            AI购物助手
          </router-link>
          <router-link
            to="/orders"
            class="nav-link"
            :class="{ active: isActive('/orders') }"
          >
            我的订单
          </router-link>
        </div>
      </div>
    </nav>
  </header>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'
import { useCartStore } from '@/store/cart'
import { getCategories } from '@/api/category'
import { getProducts } from '@/api/product'
import { resolveImage } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const keyword = ref('')
const categories = ref([])
const hotWords = ref([])

// 商品名缩写：截取原名前缀（保证是原商品名的子串，点击后模糊搜索必定命中该商品）
const shortName = (name) => {
  const full = String(name || '').trim()
  if (full.length <= 10) return full
  const head = full.slice(0, 10)
  const cut = head.lastIndexOf(' ')
  return (cut > 0 ? head.slice(0, cut) : head).trim()
}

// 热词：取当前最热销的前 4 个商品名称缩写
const loadHotWords = async () => {
  try {
    const res = await getProducts({ page: 1, limit: 4, sortBy: 'sales', order: 'desc' })
    hotWords.value = (res.data.products || []).map((p) => shortName(p.name)).filter(Boolean)
  } catch (error) {
    hotWords.value = []
  }
}

// 商家端入口地址（与本机同主机、端口 3002），「商家入驻」点击后跳转商家登录页
const merchantLoginUrl = `${window.location.protocol}//${window.location.hostname}:3002/login`

const isActive = (path) => (path === '/' ? route.path === '/' : route.path.startsWith(path))

const loadCategories = async () => {
  try {
    const res = await getCategories({ limit: 100, sortBy: 'sort', order: 'asc' })
    categories.value = (res.data.users || []).filter((c) => c.status === 'active')
  } catch (error) {
    categories.value = []
  }
}

const handleSearch = () => {
  const kw = keyword.value.trim()
  router.push({ name: 'ProductList', query: kw ? { keyword: kw } : {} })
}

const searchWord = (word) => {
  keyword.value = word
  handleSearch()
}

const goCategory = (categoryId) => {
  router.push({ name: 'ProductList', query: { category_id: categoryId } })
}

const handleCommand = async (command) => {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      userStore.logout()
      cartStore.clear()
      router.push('/login')
    } catch {
      /* 取消 */
    }
    return
  }
  const map = {
    profile: '/profile',
    orders: '/orders',
    favorites: '/favorites',
    'after-sales': '/after-sales'
  }
  if (map[command]) router.push(map[command])
}

// 登录状态变化时同步购物车角标
watch(
  () => userStore.isAuthenticated,
  (val) => {
    if (val) cartStore.loadCart()
    else cartStore.clear()
  }
)

onMounted(() => {
  loadCategories()
  loadHotWords()
  if (userStore.isAuthenticated) cartStore.loadCart()
})
</script>

<style scoped>
.mall-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.header-top {
  background: #2b2b2b;
  color: #cfcfcf;
  font-size: 12px;
  height: 32px;
}

.top-inner {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.top-links {
  display: flex;
  align-items: center;
  gap: 8px;
}

.top-links a:hover {
  color: #fff;
}

.top-links .divider {
  color: #555;
}

.register-link {
  color: #ffb199;
}

/* 商家入驻入口 */
.merchant-link {
  color: #ffb199;
  cursor: pointer;
}

.header-main {
  padding: 18px 0;
}

.main-inner {
  display: flex;
  align-items: center;
  gap: 28px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.logo-mark {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--brand-gradient);
  color: #fff;
  font-size: 22px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 14px rgba(255, 77, 33, 0.35);
}

.logo-text {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 1px;
  background: var(--brand-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.search-box {
  flex: 1;
  max-width: 640px;
}

.hot-words {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 12px;
  color: #999;
}

.hot-word {
  cursor: pointer;
  transition: color 0.2s;
}

.hot-word:hover {
  color: var(--brand);
}

.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 12px;
  color: #555;
  cursor: pointer;
  transition: all 0.2s;
}

.action-item:hover {
  color: var(--brand);
  background: var(--brand-light);
}

.cart-action :deep(.el-badge__content) {
  border: none;
}

.user-action {
  flex-direction: row;
  gap: 6px;
  max-width: 150px;
}

.username {
  max-width: 80px;
  font-size: 13px;
  color: #333;
}

.header-nav {
  border-top: 1px solid var(--border-color);
}

.nav-inner {
  display: flex;
  align-items: center;
  height: 46px;
}

.all-category {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 46px;
  padding: 0 20px;
  background: var(--brand-gradient);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 10px 10px 0 0;
  margin-top: 0;
}

.all-category .arrow {
  margin-left: 4px;
  font-size: 12px;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 24px;
}

.nav-link {
  padding: 8px 18px;
  font-size: 15px;
  color: #333;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-link:hover,
.nav-link.active {
  color: var(--brand);
  font-weight: 600;
  background: var(--brand-light);
}
</style>
