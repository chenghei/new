<template>
  <Layout>
    <div class="profile">
      <div class="profile-header">
        <h2>个人资料</h2>
        <p>管理您的个人信息和账户设置</p>
      </div>

      <el-row :gutter="20">
        <el-col :span="16">
          <el-card title="基本信息">
            <template #header>
              <div class="card-header">
                <span>基本信息</span>
                <el-button v-if="!isEditing" type="primary" @click="startEdit">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
              </div>
            </template>

            <el-form
              ref="profileFormRef"
              :model="profileForm"
              :rules="profileRules"
              label-width="100px"
            >
              <el-form-item label="用户名">
                <el-input v-model="profileForm.username" disabled />
              </el-form-item>

              <el-form-item label="邮箱">
                <el-input v-model="profileForm.email" disabled />
              </el-form-item>

              <el-form-item label="昵称" prop="nickname">
                <el-input
                  v-model="profileForm.nickname"
                  :disabled="!isEditing"
                  placeholder="请输入昵称"
                />
              </el-form-item>

              <el-form-item label="头像" prop="avatar">
                <el-input
                  v-model="profileForm.avatar"
                  :disabled="!isEditing"
                  placeholder="请输入头像URL"
                />
              </el-form-item>

              <el-form-item label="角色">
                <el-tag :type="profileForm.role === 'admin' ? 'danger' : 'primary'">
                  {{ profileForm.role === 'admin' ? '管理员' : '普通用户' }}
                </el-tag>
              </el-form-item>

              <el-form-item label="状态">
                <el-tag :type="profileForm.status === 'active' ? 'success' : 'warning'">
                  {{ profileForm.status === 'active' ? '正常' : '禁用' }}
                </el-tag>
              </el-form-item>

              <el-form-item label="注册时间">
                <span>{{ formatDate(profileForm.created_at) }}</span>
              </el-form-item>

              <el-form-item v-if="isEditing">
                <el-button type="primary" :loading="loading" @click="saveProfile">
                  保存
                </el-button>
                <el-button @click="cancelEdit">取消</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card title="修改密码">
            <template #header>
              <div class="card-header">
                <span>修改密码</span>
              </div>
            </template>

            <el-form
              ref="passwordFormRef"
              :model="passwordForm"
              :rules="passwordRules"
              label-width="100px"
            >
              <el-form-item label="当前密码" prop="oldPassword">
                <el-input
                  v-model="passwordForm.oldPassword"
                  type="password"
                  placeholder="请输入当前密码"
                  show-password
                />
              </el-form-item>

              <el-form-item label="新密码" prop="newPassword">
                <el-input
                  v-model="passwordForm.newPassword"
                  type="password"
                  placeholder="请输入新密码"
                  show-password
                />
              </el-form-item>

              <el-form-item label="确认密码" prop="confirmPassword">
                <el-input
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  placeholder="请确认新密码"
                  show-password
                />
              </el-form-item>

              <el-form-item>
                <el-button type="primary" :loading="passwordLoading" @click="changePassword">
                  修改密码
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </Layout>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import { updateUser, updatePassword } from '@/api/user'
import Layout from '@/components/Layout.vue'

const userStore = useUserStore()

const profileFormRef = ref()
const passwordFormRef = ref()
const loading = ref(false)
const passwordLoading = ref(false)
const isEditing = ref(false)

const profileForm = reactive({
  username: '',
  email: '',
  nickname: '',
  avatar: '',
  role: '',
  status: '',
  created_at: ''
})

const originalProfile = reactive({})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const profileRules = {
  nickname: [
    { max: 50, message: '昵称最多50个字符', trigger: 'blur' }
  ],
  avatar: [
    { type: 'url', message: '请输入正确的URL格式', trigger: 'blur' }
  ]
}

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  oldPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度应在6-50个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString()
}

const loadProfile = () => {
  const user = userStore.userInfo
  if (user) {
    Object.assign(profileForm, user)
    Object.assign(originalProfile, user)
  }
}

const startEdit = () => {
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
  Object.assign(profileForm, originalProfile)
}

const saveProfile = async () => {
  if (!profileFormRef.value) return

  const valid = await profileFormRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true

  try {
    const updateData = {
      nickname: profileForm.nickname,
      avatar: profileForm.avatar
    }

    await updateUser(userStore.userInfo.id, updateData)
    userStore.updateUserInfo(updateData)
    Object.assign(originalProfile, profileForm)
    isEditing.value = false
    ElMessage.success('个人信息更新成功')
  } catch (error) {
    console.error('更新个人信息失败:', error)
  } finally {
    loading.value = false
  }
}

const changePassword = async () => {
  if (!passwordFormRef.value) return

  const valid = await passwordFormRef.value.validate().catch(() => false)
  if (!valid) return

  passwordLoading.value = true

  try {
    await updatePassword(userStore.userInfo.id, {
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    })

    // 重置表单
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    passwordFormRef.value.resetFields()

    ElMessage.success('密码修改成功')
  } catch (error) {
    console.error('修改密码失败:', error)
  } finally {
    passwordLoading.value = false
  }
}

onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.profile {
  /* max-width: 1200px; */
  margin: 0 auto;
}

.profile-header {
  margin-bottom: 30px;
}

.profile-header h2 {
  color: #333;
  margin-bottom: 8px;
}

.profile-header p {
  color: #666;
  font-size: 14px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>