<template>
  <Layout>
    <div class="dashboard">
      <div class="dashboard-header">
        <h2>仪表板</h2>
        <p>欢迎使用全栈开发模板系统</p>
      </div>

      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ stats.totalUsers }}</div>
              <div class="stat-label">总用户数</div>
            </div>
            <div class="stat-icon">
              <el-icon size="40" color="#409eff"><User /></el-icon>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ stats.activeUsers }}</div>
              <div class="stat-label">活跃用户</div>
            </div>
            <div class="stat-icon">
              <el-icon size="40" color="#67c23a"><UserFilled /></el-icon>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ stats.todayLogin }}</div>
              <div class="stat-label">今日登录</div>
            </div>
            <div class="stat-icon">
              <el-icon size="40" color="#e6a23c"><Calendar /></el-icon>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ stats.systemStatus }}</div>
              <div class="stat-label">系统状态</div>
            </div>
            <div class="stat-icon">
              <el-icon size="40" color="#f56c6c"><Monitor /></el-icon>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px;">
        <el-col :span="12">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>快速操作</span>
              </div>
            </template>
            <div class="quick-actions">
              <el-button type="primary" @click="goToProfile">
                <el-icon><User /></el-icon>
                编辑个人资料
              </el-button>
              <el-button v-if="userStore.isAdmin" type="success" @click="goToUsers">
                <el-icon><Avatar /></el-icon>
                用户管理
              </el-button>
              <el-button type="info" @click="refreshStats">
                <el-icon><Refresh /></el-icon>
                刷新数据
              </el-button>
            </div>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>系统信息</span>
              </div>
            </template>
            <div class="system-info">
              <div class="info-item">
                <span class="info-label">版本：</span>
                <span class="info-value">v1.0.0</span>
              </div>
              <div class="info-item">
                <span class="info-label">技术栈：</span>
                <span class="info-value">Vue3 + Node.js + MySQL</span>
              </div>
              <div class="info-item">
                <span class="info-label">部署时间：</span>
                <span class="info-value">{{ new Date().toLocaleString() }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">当前用户：</span>
                <span class="info-value">{{ userStore.userInfo?.username }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </Layout>
</template>

<script setup>
import { reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import Layout from '@/components/Layout.vue'

const router = useRouter()
const userStore = useUserStore()

const stats = reactive({
  totalUsers: 0,
  activeUsers: 0,
  todayLogin: 0,
  systemStatus: '正常'
})

const goToProfile = () => {
  router.push('/profile')
}

const goToUsers = () => {
  router.push('/users')
}

const refreshStats = () => {
  loadStats()
}

const loadStats = () => {
  // 这里可以调用API获取实际统计数据
  // 目前使用模拟数据
  stats.totalUsers = Math.floor(Math.random() * 1000) + 100
  stats.activeUsers = Math.floor(stats.totalUsers * 0.8)
  stats.todayLogin = Math.floor(Math.random() * 50) + 10
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.dashboard {
  /* max-width: 1200px; */
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 30px;
}

.dashboard-header h2 {
  color: #333;
  margin-bottom: 8px;
}

.dashboard-header p {
  color: #666;
  font-size: 14px;
}

.stat-card {
  position: relative;
  overflow: hidden;
}

.stat-card :deep(.el-card__body) {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 32px;
  font-weight: 600;
  color: #333;
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.stat-icon {
  opacity: 0.8;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-actions .el-button {
  justify-content: flex-start;
}

.system-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  color: #666;
  font-size: 14px;
}

.info-value {
  color: #333;
  font-size: 14px;
  font-weight: 500;
}
</style>