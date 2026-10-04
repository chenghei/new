<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-banner">
        <router-link to="/" class="brand">
          <span class="logo-mark">优</span>
          <span>优选商城</span>
        </router-link>
        <div class="banner-text">
          <h1>欢迎回来</h1>
          <p>登录后即可收藏心仪好物、使用 AI 购物助手、管理订单与售后</p>
        </div>
        <ul class="banner-points">
          <li><el-icon><MagicStick /></el-icon> AI 智能导购，懂你所想</li>
          <li><el-icon><ShoppingCart /></el-icon> 购物车一键批量结算</li>
          <li><el-icon><RefreshLeft /></el-icon> 退款退货，售后无忧</li>
        </ul>
      </div>

      <div class="auth-form">
        <h2>账号登录</h2>
        <p class="sub">使用用户名或邮箱登录</p>

        <el-form ref="formRef" :model="form" :rules="rules" size="large" @submit.prevent="handleLogin">
          <el-form-item prop="username">
            <el-input v-model="form.username" placeholder="用户名 / 邮箱" :prefix-icon="User" clearable />
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
          <el-form-item>
            <el-button type="primary" class="submit-btn" :loading="loading" @click="handleLogin">
              登 录
            </el-button>
          </el-form-item>
        </el-form>

        <div class="auth-footer">
          还没有账号？<router-link to="/register">立即注册</router-link>
          <span class="back-home" @click="$router.push('/')">返回首页</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import { useCartStore } from '@/store/cart'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名或邮箱', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await userStore.login(form)
    cartStore.loadCart()
    router.push(route.query.redirect || '/')
  } catch (error) {
    /* 错误提示已在拦截器中统一处理 */
  } finally {
    loading.value = false
  }
}
</script>

<style scoped src="@/styles/auth.css"></style>
