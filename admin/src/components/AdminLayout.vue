<template>
  <el-container class="admin-layout">
    <!-- 侧边栏 -->
    <el-aside :width="collapsed ? '64px' : '220px'" class="sidebar">
      <div class="logo">
        <span class="logo-mark">优</span>
        <span v-show="!collapsed" class="logo-text">管理后台</span>
      </div>
      <el-scrollbar class="menu-scroll">
        <el-menu
          :default-active="activeMenu"
          class="sidebar-menu"
          :collapse="collapsed"
          :collapse-transition="false"
          background-color="transparent"
          text-color="#a9b4c6"
          active-text-color="#ffffff"
          router
        >
          <el-menu-item index="/dashboard">
            <el-icon><Odometer /></el-icon>
            <template #title>数据统计</template>
          </el-menu-item>
          <el-menu-item index="/users">
            <el-icon><User /></el-icon>
            <template #title>用户管理</template>
          </el-menu-item>
          <el-menu-item index="/merchants">
            <el-icon><Shop /></el-icon>
            <template #title>商家管理</template>
          </el-menu-item>
          <el-menu-item index="/products">
            <el-icon><Goods /></el-icon>
            <template #title>商品管理</template>
          </el-menu-item>
          <el-menu-item index="/categories">
            <el-icon><Menu /></el-icon>
            <template #title>分类管理</template>
          </el-menu-item>
          <el-menu-item index="/orders">
            <el-icon><List /></el-icon>
            <template #title>订单监管</template>
          </el-menu-item>
          <el-menu-item index="/after-sales">
            <el-icon><RefreshLeft /></el-icon>
            <template #title>售后监管</template>
          </el-menu-item>
          <el-menu-item index="/ai-logs">
            <el-icon><MagicStick /></el-icon>
            <template #title>AI调用记录</template>
          </el-menu-item>
          <el-menu-item index="/ai-contents">
            <el-icon><Document /></el-icon>
            <template #title>AI生成内容</template>
          </el-menu-item>
          <el-menu-item index="/ai-config">
            <el-icon><Setting /></el-icon>
            <template #title>AI服务配置</template>
          </el-menu-item>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <el-container>
      <!-- 顶栏 -->
      <el-header class="topbar">
        <div class="topbar-left">
          <el-icon class="collapse-btn" @click="collapsed = !collapsed">
            <Fold v-if="!collapsed" />
            <Expand v-else />
          </el-icon>
          <span class="page-title">{{ route.meta.title || '管理后台' }}</span>
        </div>
        <div class="topbar-right">
          <el-tag type="danger" effect="plain" round size="small">
            <el-icon><Avatar /></el-icon>
            平台管理员
          </el-tag>
          <el-dropdown @command="handleCommand">
            <div class="user-info">
              <el-avatar :size="30" :src="resolveImage(userStore.userInfo?.avatar)">
                <el-icon><User /></el-icon>
              </el-avatar>
              <span class="username ellipsis">{{ userStore.displayName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="dashboard">
                  <el-icon><Odometer /></el-icon>数据统计
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'
import { resolveImage } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const collapsed = ref(false)

const activeMenu = computed(() => {
  const path = route.path
  const menus = [
    '/dashboard',
    '/users',
    '/merchants',
    '/products',
    '/categories',
    '/orders',
    '/after-sales',
    '/ai-logs',
    '/ai-contents',
    '/ai-config'
  ]
  return menus.find((m) => path.startsWith(m)) || path
})

const handleCommand = async (command) => {
  if (command === 'dashboard') {
    router.push('/dashboard')
    return
  }
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      userStore.logout()
      router.push('/login')
    } catch {
      /* 取消 */
    }
  }
}
</script>

<style scoped>
.admin-layout {
  height: 100vh;
}

.sidebar {
  background: var(--sidebar-bg);
  transition: width 0.2s;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 58px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 18px;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  white-space: nowrap;
}

.logo-mark {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--brand-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 18px;
}

.logo-text {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
}

.menu-scroll {
  flex: 1;
  overflow-y: auto;
}

.sidebar-menu {
  border-right: none;
  padding: 8px;
}

.sidebar-menu :deep(.el-menu-item) {
  height: 46px;
  border-radius: 8px;
  margin-bottom: 4px;
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: var(--brand-gradient);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(255, 77, 33, 0.35);
}

.topbar {
  height: 58px;
  background: #fff;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.collapse-btn {
  font-size: 18px;
  color: var(--text-regular);
  cursor: pointer;
}

.collapse-btn:hover {
  color: var(--brand);
}

.page-title {
  font-size: 16px;
  font-weight: 600;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.user-info:hover {
  background: #f5f6f8;
}

.username {
  max-width: 120px;
  font-size: 14px;
  color: var(--text-primary);
}

.main {
  background: var(--bg-page);
  padding: 18px;
  overflow-y: auto;
}
</style>
