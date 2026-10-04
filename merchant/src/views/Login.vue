<template>
  <div class="login-page">
    <div class="login-box">
      <div class="brand">
        <span class="logo-mark">优</span>
        <div>
          <h1>优选商城 · 商家后台</h1>
          <p>商品管理 · 订单处理 · 数据统计 · AI 赋能</p>
        </div>
      </div>

      <el-tabs v-model="activeTab" class="login-tabs" stretch>
        <el-tab-pane label="账号登录" name="login">
          <el-form ref="loginRef" :model="loginForm" :rules="loginRules" size="large" @submit.prevent="handleLogin">
            <el-form-item prop="username">
              <el-input v-model="loginForm.username" placeholder="用户名 / 邮箱" :prefix-icon="User" clearable />
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="密码"
                :prefix-icon="Lock"
                show-password
                @keyup.enter="handleLogin"
              />
            </el-form-item>
            <el-button type="primary" class="submit-btn" :loading="loading" @click="handleLogin">
              登 录
            </el-button>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="注册商家账号" name="register">
          <el-form
            ref="registerRef"
            :model="registerForm"
            :rules="registerRules"
            size="large"
            @submit.prevent="handleRegister"
          >
            <el-form-item prop="username">
              <el-input v-model="registerForm.username" placeholder="用户名（3-50位字母或数字）" :prefix-icon="User" clearable />
            </el-form-item>
            <el-form-item prop="email">
              <el-input v-model="registerForm.email" placeholder="邮箱" :prefix-icon="Message" clearable />
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="registerForm.password"
                type="password"
                placeholder="密码（至少6位）"
                :prefix-icon="Lock"
                show-password
              />
            </el-form-item>
            <el-button type="primary" class="submit-btn" :loading="registering" @click="handleRegister">
              注 册
            </el-button>
            <p class="tip">注册后需提交商家入驻申请，审核通过后即可使用后台功能</p>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { User, Lock, Message } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import { useShopStore } from '@/store/shop'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const shopStore = useShopStore()

const activeTab = ref('login')
const loginRef = ref()
const registerRef = ref()
const loading = ref(false)
const registering = ref(false)

const loginForm = reactive({ username: '', password: '' })
const registerForm = reactive({ username: '', email: '', password: '' })

const loginRules = {
  username: [{ required: true, message: '请输入用户名或邮箱', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9]{3,50}$/, message: '用户名需为3-50位字母或数字', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度需为6-50位', trigger: 'blur' }
  ]
}

const goNext = () => {
  router.push(route.query.redirect || '/')
}

const handleLogin = async () => {
  const valid = await loginRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    await userStore.login(loginForm)
    await shopStore.loadShop()
    goNext()
  } catch (error) {
    /* 已提示 */
  } finally {
    loading.value = false
  }
}

const handleRegister = async () => {
  const valid = await registerRef.value.validate().catch(() => false)
  if (!valid) return
  registering.value = true
  try {
    await userStore.register(registerForm)
    shopStore.clear()
    router.push('/apply')
  } catch (error) {
    /* 已提示 */
  } finally {
    registering.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 20% 20%, #2b3648 0%, #1f2937 45%, #111827 100%);
  padding: 20px;
}

.login-box {
  width: 420px;
  background: #fff;
  border-radius: 16px;
  padding: 34px 34px 26px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
}

.logo-mark {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--brand-gradient);
  color: #fff;
  font-size: 24px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 18px rgba(255, 77, 33, 0.35);
}

.brand h1 {
  font-size: 19px;
  font-weight: 800;
  color: var(--text-primary);
}

.brand p {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.login-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

.submit-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  letter-spacing: 4px;
  background: var(--brand-gradient);
  border: none;
  margin-top: 4px;
}

.tip {
  margin-top: 14px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
