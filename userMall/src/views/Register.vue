<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-banner">
        <router-link to="/" class="brand">
          <span class="logo-mark">优</span>
          <span>优选商城</span>
        </router-link>
        <div class="banner-text">
          <h1>创建账号</h1>
          <p>注册优选商城账号，开启你的品质购物之旅</p>
        </div>
        <ul class="banner-points">
          <li><el-icon><GoodsFilled /></el-icon> 海量商品，分类清晰</li>
          <li><el-icon><Search /></el-icon> 关键词搜索与多维筛选</li>
          <li><el-icon><Star /></el-icon> 收藏心愿单，随时回看</li>
        </ul>
      </div>

      <div class="auth-form">
        <h2>用户注册</h2>
        <p class="sub">填写以下信息完成注册</p>

        <el-form ref="formRef" :model="form" :rules="rules" size="large" @submit.prevent="handleRegister">
          <el-form-item prop="username">
            <el-input v-model="form.username" placeholder="用户名（3-50位字母或数字）" :prefix-icon="User" clearable />
          </el-form-item>
          <el-form-item prop="email">
            <el-input v-model="form.email" placeholder="邮箱" :prefix-icon="Message" clearable />
          </el-form-item>
          <el-form-item prop="nickname">
            <el-input v-model="form.nickname" placeholder="昵称（选填）" :prefix-icon="Avatar" clearable />
          </el-form-item>
          <el-form-item prop="password">
            <el-input v-model="form.password" type="password" placeholder="密码（至少6位）" :prefix-icon="Lock" show-password />
          </el-form-item>
          <el-form-item prop="confirmPassword">
            <el-input
              v-model="form.confirmPassword"
              type="password"
              placeholder="确认密码"
              :prefix-icon="Lock"
              show-password
              @keyup.enter="handleRegister"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" class="submit-btn" :loading="loading" @click="handleRegister">
              注 册
            </el-button>
          </el-form-item>
        </el-form>

        <div class="auth-footer">
          已有账号？<router-link to="/login">立即登录</router-link>
          <span class="back-home" @click="$router.push('/')">返回首页</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, Message, Avatar } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  email: '',
  nickname: '',
  password: '',
  confirmPassword: ''
})

const validateConfirm = (rule, value, callback) => {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9]{3,50}$/, message: '用户名需为3-50位字母或数字', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  nickname: [{ max: 50, message: '昵称最多50个字符', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度需为6-50位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await userStore.register({
      username: form.username,
      email: form.email,
      nickname: form.nickname || undefined,
      password: form.password
    })
    router.push('/')
  } catch (error) {
    /* 错误提示已统一处理 */
  } finally {
    loading.value = false
  }
}
</script>

<style scoped src="@/styles/auth.css"></style>
