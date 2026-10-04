<template>
  <div class="login-page">
    <div class="login-box">
      <div class="brand">
        <span class="logo-mark"><el-icon size="24"><Monitor /></el-icon></span>
        <div>
          <h1>优选商城 · 管理后台</h1>
          <p>用户商家管理 · 商品审核 · 交易监管 · 数据与 AI 管理</p>
        </div>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" size="large" @submit.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="管理员账号 / 邮箱" :prefix-icon="User" clearable />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
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

      <p class="tip">仅限管理员账号登录，普通用户与商家请使用对应端登录</p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { User, Lock, Monitor } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)
const form = reactive({ username: '', password: '' })

const rules = {
  username: [{ required: true, message: '请输入管理员账号或邮箱', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await userStore.login(form)
    router.push(route.query.redirect || '/')
  } catch (error) {
    /* 已提示 */
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 15% 15%, #1e2a44 0%, #141c2e 45%, #0b1120 100%);
  padding: 20px;
}

.login-box {
  width: 430px;
  background: #fff;
  border-radius: 16px;
  padding: 36px 36px 26px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 26px;
}

.logo-mark {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--brand-gradient);
  color: #fff;
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
  margin-top: 16px;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}
</style>
