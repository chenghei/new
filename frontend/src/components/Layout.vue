<template>
  <el-container class="layout-container">
    <!-- 头部导航 -->
    <el-header class="layout-header">
      <div class="header-left">
        <h1 class="logo">全栈开发模板</h1>
      </div>
      <div class="header-right">
        <el-space>
          <span class="welcome-text">欢迎，{{ userStore.userInfo?.nickname || userStore.userInfo?.username }}</span>
          <el-dropdown @command="handleCommand">
            <el-avatar
              :src="userStore.userInfo?.avatar"
              :size="32"
            >
              <el-icon><User /></el-icon>
            </el-avatar>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  个人资料
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </el-space>
      </div>
    </el-header>

    <el-container>
      <!-- 侧边导航 -->
      <el-aside width="200px" class="layout-aside">
        <el-menu
          :default-active="$route.path"
          class="side-menu"
          router
        >
          <el-menu-item index="/dashboard">
            <el-icon><Odometer /></el-icon>
            <span>仪表板</span>
          </el-menu-item>
          <el-menu-item index="/profile">
            <el-icon><User /></el-icon>
            <span>个人资料</span>
          </el-menu-item>
          <el-menu-item v-if="userStore.isAdmin" index="/users">
            <el-icon><Avatar /></el-icon>
            <span>用户管理</span>
          </el-menu-item>
          <el-menu-item v-if="userStore.isAdmin" index="/categories">
            <el-icon><Menu /></el-icon>
            <span>分类管理</span>
          </el-menu-item>
          <el-menu-item v-if="userStore.isAdmin" index="/products">
            <el-icon><Goods /></el-icon>
            <span>商品管理</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 主内容区域 -->
      <el-main class="layout-main">
        <div class="main-content">
          <slot />
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { ElMessageBox } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const handleCommand = async (command) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'logout':
      try {
        await ElMessageBox.confirm(
          '确定要退出登录吗？',
          '提示',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        userStore.logout()
        router.push('/login')
      } catch {
        // 用户取消操作
      }
      break
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.layout-header {
  background: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-left .logo {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
}

.welcome-text {
  color: #666;
  font-size: 14px;
}

.layout-aside {
  background: #fff;
  border-right: 1px solid #e6e6e6;
}

.side-menu {
  border-right: none;
}

.layout-main {
  background: #f5f5f5;
  padding: 0;
}

.main-content {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}
</style>