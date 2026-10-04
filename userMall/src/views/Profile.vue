<template>
  <div class="page">
    <div class="container profile">
      <!-- 左侧：账号概览 -->
      <aside class="side">
        <div class="user-card">
          <el-avatar :size="72" :src="resolveImage(user?.avatar)">
            <el-icon size="30"><User /></el-icon>
          </el-avatar>
          <h3 class="name">{{ userStore.displayName }}</h3>
          <p class="account">@{{ user?.username }}</p>
          <el-tag :type="user?.id_verified ? 'success' : 'info'" size="small" effect="light" round>
            {{ user?.id_verified ? '已实名认证' : '未实名认证' }}
          </el-tag>
        </div>

        <div class="order-overview">
          <div class="overview-title">我的订单</div>
          <div class="overview-grid">
            <div class="overview-item" v-for="item in orderOverview" :key="item.status" @click="goOrders(item.status)">
              <span class="num">{{ item.count }}</span>
              <span class="label">{{ item.label }}</span>
            </div>
          </div>
          <el-button class="all-order-btn" @click="goOrders()">查看全部订单</el-button>
        </div>

        <div class="quick-links">
          <router-link to="/favorites"><el-icon><Star /></el-icon>我的收藏</router-link>
          <router-link to="/after-sales"><el-icon><RefreshLeft /></el-icon>退款/售后</router-link>
          <router-link to="/ai-assistant"><el-icon><MagicStick /></el-icon>AI购物助手</router-link>
        </div>
      </aside>

      <!-- 右侧：资料编辑 -->
      <section class="main">
        <el-tabs v-model="activeTab" class="profile-tabs">
          <!-- 基本资料 -->
          <el-tab-pane label="基本资料" name="basic">
            <el-form ref="basicRef" :model="basicForm" :rules="basicRules" label-width="90px" class="form">
              <el-form-item label="头像">
                <div class="avatar-uploader">
                  <el-avatar :size="64" :src="resolveImage(basicForm.avatar)">
                    <el-icon size="24"><User /></el-icon>
                  </el-avatar>
                  <el-upload
                    :show-file-list="false"
                    :http-request="handleAvatarUpload"
                    accept="image/*"
                  >
                    <el-button size="small" :loading="uploading">更换头像</el-button>
                  </el-upload>
                  <span class="tip">支持 jpg / png，建议 200×200</span>
                </div>
              </el-form-item>
              <el-form-item label="用户名">
                <el-input :model-value="user?.username" disabled />
              </el-form-item>
              <el-form-item label="邮箱">
                <el-input :model-value="user?.email" disabled />
              </el-form-item>
              <el-form-item label="昵称" prop="nickname">
                <el-input v-model="basicForm.nickname" placeholder="请输入昵称" maxlength="50" />
              </el-form-item>
              <el-form-item label="手机号" prop="phone">
                <el-input v-model="basicForm.phone" placeholder="请输入手机号" maxlength="11" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="savingBasic" @click="saveBasic">保存修改</el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <!-- 实名认证 -->
          <el-tab-pane label="实名认证" name="identity">
            <el-alert
              v-if="user?.id_verified"
              title="您已完成实名认证"
              type="success"
              :closable="false"
              show-icon
              class="identity-alert"
            />
            <el-alert
              v-else
              title="完成实名认证后可享受更完整的购物与售后服务"
              type="warning"
              :closable="false"
              show-icon
              class="identity-alert"
            />
            <el-form
              ref="identityRef"
              :model="identityForm"
              :rules="identityRules"
              label-width="90px"
              class="form"
              :disabled="user?.id_verified"
            >
              <el-form-item label="真实姓名" prop="real_name">
                <el-input v-model="identityForm.real_name" placeholder="请输入真实姓名（2-20位中文）" maxlength="20" />
              </el-form-item>
              <el-form-item label="身份证号" prop="id_card">
                <el-input v-model="identityForm.id_card" placeholder="请输入18位身份证号" maxlength="18" />
              </el-form-item>
              <el-form-item v-if="user?.id_verified">
                <span class="verified-text">
                  认证信息：{{ maskName(user?.real_name) }} · {{ maskIdCard(user?.id_card) }}
                </span>
              </el-form-item>
              <el-form-item v-else>
                <el-button type="primary" :loading="verifying" @click="submitIdentity">提交认证</el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <!-- 修改密码 -->
          <el-tab-pane label="修改密码" name="password">
            <el-form ref="pwdRef" :model="pwdForm" :rules="pwdRules" label-width="90px" class="form">
              <el-form-item label="原密码" prop="oldPassword">
                <el-input v-model="pwdForm.oldPassword" type="password" show-password placeholder="请输入原密码" />
              </el-form-item>
              <el-form-item label="新密码" prop="newPassword">
                <el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="请输入新密码（至少6位）" />
              </el-form-item>
              <el-form-item label="确认密码" prop="confirmPassword">
                <el-input v-model="pwdForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="savingPwd" @click="savePassword">确认修改</el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <!-- 收货地址 -->
          <el-tab-pane label="收货地址" name="address">
            <div class="address-head">
              <span class="address-tip">可保存多个收货地址，下单结算时会自动带入默认地址</span>
              <el-button type="primary" @click="openAddressDialog()">
                <el-icon><Plus /></el-icon> 新增收货地址
              </el-button>
            </div>

            <div v-loading="addressLoading" class="address-list">
              <div
                v-for="item in addresses"
                :key="item.id"
                class="address-item"
                :class="{ default: item.is_default }"
              >
                <div class="address-main">
                  <div class="address-line1">
                    <span class="address-name">{{ item.receiver_name }}</span>
                    <span class="address-phone">{{ item.receiver_phone }}</span>
                    <el-tag v-if="item.tag" size="small" effect="plain">{{ item.tag }}</el-tag>
                    <el-tag v-if="item.is_default" size="small" type="danger" effect="light">默认</el-tag>
                  </div>
                  <p class="address-detail">{{ fullAddress(item) }}</p>
                </div>
                <div class="address-actions">
                  <el-button v-if="!item.is_default" text type="primary" @click="handleSetDefault(item)">
                    设为默认
                  </el-button>
                  <el-button text type="primary" @click="openAddressDialog(item)">编辑</el-button>
                  <el-button text type="danger" @click="handleDeleteAddress(item)">删除</el-button>
                </div>
              </div>

              <el-empty
                v-if="!addressLoading && !addresses.length"
                description="还没有收货地址，点击右上角新增"
                :image-size="90"
              />
            </div>
          </el-tab-pane>
        </el-tabs>

        <!-- 新增 / 编辑收货地址 -->
        <el-dialog
          v-model="addressDialogVisible"
          :title="addressForm.id ? '编辑收货地址' : '新增收货地址'"
          width="480px"
        >
          <el-form ref="addressRef" :model="addressForm" :rules="addressRules" label-width="90px">
            <el-form-item label="收货人" prop="receiver_name">
              <el-input v-model="addressForm.receiver_name" placeholder="请输入收货人姓名" maxlength="50" />
            </el-form-item>
            <el-form-item label="手机号" prop="receiver_phone">
              <el-input v-model="addressForm.receiver_phone" placeholder="请输入手机号" maxlength="11" />
            </el-form-item>
            <el-form-item label="所在地区" prop="region">
              <el-input v-model="addressForm.region" placeholder="如：上海市 徐汇区" maxlength="100" />
            </el-form-item>
            <el-form-item label="详细地址" prop="detail_address">
              <el-input
                v-model="addressForm.detail_address"
                type="textarea"
                :rows="2"
                maxlength="255"
                show-word-limit
                placeholder="街道、门牌号、楼层、房间号等"
              />
            </el-form-item>
            <el-form-item label="地址标签">
              <el-radio-group v-model="addressForm.tag">
                <el-radio label="家">家</el-radio>
                <el-radio label="公司">公司</el-radio>
                <el-radio label="学校">学校</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="设为默认">
              <el-switch v-model="addressForm.is_default" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="addressDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="savingAddress" @click="saveAddress">保存</el-button>
          </template>
        </el-dialog>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'
import { updateUser, updatePassword, verifyIdentity } from '@/api/user'
import { uploadImg } from '@/api/product'
import { getOrderStatistics } from '@/api/order'
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} from '@/api/address'
import { resolveImage } from '@/utils/format'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const user = computed(() => userStore.user)

const activeTab = ref('basic')
const basicRef = ref()
const identityRef = ref()
const pwdRef = ref()

const uploading = ref(false)
const savingBasic = ref(false)
const verifying = ref(false)
const savingPwd = ref(false)

const stats = ref({})
const basicForm = reactive({ nickname: '', phone: '', avatar: '' })
const identityForm = reactive({ real_name: '', id_card: '' })
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

const orderOverview = computed(() => [
  { status: 'pending', label: '待支付', count: stats.value.pending || 0 },
  { status: 'paid', label: '待发货', count: stats.value.paid || 0 },
  { status: 'shipped', label: '待收货', count: stats.value.shipped || 0 },
  { status: 'completed', label: '已完成', count: stats.value.completed || 0 }
])

const basicRules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }]
}

const identityRules = {
  real_name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { pattern: /^[\u4e00-\u9fa5]{2,20}$/, message: '请输入2-20位中文姓名', trigger: 'blur' }
  ],
  id_card: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^\d{17}[\dXx]$/, message: '身份证号格式不正确', trigger: 'blur' }
  ]
}

const validateConfirm = (rule, value, callback) => {
  if (value !== pwdForm.newPassword) callback(new Error('两次输入的密码不一致'))
  else callback()
}

const pwdRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度需为6-50位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ]
}

const maskName = (name) => (name ? name[0] + '**' : '-')
const maskIdCard = (id) => (id ? `${id.slice(0, 6)}********${id.slice(-4)}` : '-')

const syncForm = () => {
  if (!user.value) return
  basicForm.nickname = user.value.nickname || ''
  basicForm.phone = user.value.phone || ''
  basicForm.avatar = user.value.avatar || ''
  identityForm.real_name = user.value.real_name || ''
  identityForm.id_card = user.value.id_card || ''
}

const loadStats = async () => {
  try {
    const res = await getOrderStatistics()
    const map = {}
    ;(res.data.statusStatistics || []).forEach((s) => {
      map[s.status] = Number(s.count || 0)
    })
    stats.value = map
  } catch (error) {
    stats.value = {}
  }
}

const handleAvatarUpload = async ({ file }) => {
  const formData = new FormData()
  formData.append('file', file)
  uploading.value = true
  try {
    const res = await uploadImg(formData)
    basicForm.avatar = res.data
    ElMessage.success('头像上传成功，请点击保存')
  } catch (error) {
    /* 已提示 */
  } finally {
    uploading.value = false
  }
}

const saveBasic = async () => {
  const valid = await basicRef.value.validate().catch(() => false)
  if (!valid) return
  savingBasic.value = true
  try {
    const res = await updateUser(user.value.id, {
      nickname: basicForm.nickname,
      phone: basicForm.phone,
      avatar: basicForm.avatar
    })
    userStore.updateUserInfo(res.data.user)
    ElMessage.success('资料已更新')
  } catch (error) {
    /* 已提示 */
  } finally {
    savingBasic.value = false
  }
}

const submitIdentity = async () => {
  const valid = await identityRef.value.validate().catch(() => false)
  if (!valid) return
  verifying.value = true
  try {
    const res = await verifyIdentity(user.value.id, identityForm)
    userStore.updateUserInfo(res.data.user)
    ElMessage.success('实名认证成功')
  } catch (error) {
    /* 已提示 */
  } finally {
    verifying.value = false
  }
}

const savePassword = async () => {
  const valid = await pwdRef.value.validate().catch(() => false)
  if (!valid) return
  savingPwd.value = true
  try {
    await updatePassword(user.value.id, {
      oldPassword: pwdForm.oldPassword,
      newPassword: pwdForm.newPassword
    })
    ElMessage.success('密码修改成功，请重新登录')
    pwdForm.oldPassword = pwdForm.newPassword = pwdForm.confirmPassword = ''
    setTimeout(() => {
      userStore.logout()
      router.push('/login')
    }, 800)
  } catch (error) {
    /* 已提示 */
  } finally {
    savingPwd.value = false
  }
}

const goOrders = (status) => {
  router.push({ name: 'Orders', query: status ? { status } : {} })
}

/* -------------------- 收货地址 -------------------- */
const addresses = ref([])
const addressLoading = ref(false)
const addressDialogVisible = ref(false)
const savingAddress = ref(false)
const addressRef = ref()

const addressForm = reactive({
  id: null,
  receiver_name: '',
  receiver_phone: '',
  region: '',
  detail_address: '',
  tag: '家',
  is_default: false
})

const addressRules = {
  receiver_name: [{ required: true, message: '请输入收货人姓名', trigger: 'blur' }],
  receiver_phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  detail_address: [{ required: true, message: '请输入详细地址', trigger: 'blur' }]
}

// 拼装完整地址用于展示（省市区 + 详细地址）
const fullAddress = (item) => [item.region, item.detail_address].filter(Boolean).join(' ')

const loadAddresses = async () => {
  addressLoading.value = true
  try {
    const res = await getAddresses()
    addresses.value = res.data || []
  } catch (error) {
    addresses.value = []
  } finally {
    addressLoading.value = false
  }
}

// 打开新增/编辑弹窗：新增时默认带出昵称与手机号，减少输入
const openAddressDialog = (item) => {
  Object.assign(addressForm, {
    id: item?.id || null,
    receiver_name: item?.receiver_name || user.value?.nickname || '',
    receiver_phone: item?.receiver_phone || user.value?.phone || '',
    region: item?.region || '',
    detail_address: item?.detail_address || '',
    tag: item?.tag || '家',
    is_default: item ? item.is_default : addresses.value.length === 0
  })
  addressDialogVisible.value = true
}

const saveAddress = async () => {
  const valid = await addressRef.value.validate().catch(() => false)
  if (!valid) return
  savingAddress.value = true
  try {
    const payload = {
      receiver_name: addressForm.receiver_name,
      receiver_phone: addressForm.receiver_phone,
      region: addressForm.region,
      detail_address: addressForm.detail_address,
      tag: addressForm.tag,
      is_default: addressForm.is_default
    }
    if (addressForm.id) {
      await updateAddress(addressForm.id, payload)
      ElMessage.success('地址已更新')
    } else {
      await createAddress(payload)
      ElMessage.success('新增地址成功')
    }
    addressDialogVisible.value = false
    loadAddresses()
  } catch (error) {
    /* 已提示 */
  } finally {
    savingAddress.value = false
  }
}

const handleSetDefault = async (item) => {
  try {
    await setDefaultAddress(item.id)
    ElMessage.success('已设为默认地址')
    loadAddresses()
  } catch (error) {
    /* 已提示 */
  }
}

const handleDeleteAddress = async (item) => {
  try {
    await ElMessageBox.confirm(`确定要删除「${item.receiver_name}」的收货地址吗？`, '删除地址', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await deleteAddress(item.id)
    ElMessage.success('地址已删除')
    loadAddresses()
  } catch (error) {
    /* 已提示 */
  }
}

onMounted(() => {
  syncForm()
  loadStats()
  loadAddresses()
  // 支持从结算页等入口直接跳到「收货地址」页签
  if (route.query.tab === 'address') activeTab.value = 'address'
})
</script>

<style scoped>
.profile {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.side {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-card {
  background: #fff;
  border-radius: var(--radius);
  padding: 28px 20px;
  text-align: center;
  box-shadow: var(--shadow-card);
}

.user-card .name {
  margin: 14px 0 4px;
  font-size: 18px;
  font-weight: 700;
}

.user-card .account {
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 12px;
}

.order-overview,
.quick-links {
  background: #fff;
  border-radius: var(--radius);
  padding: 18px;
  box-shadow: var(--shadow-card);
}

.overview-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 14px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.overview-item {
  text-align: center;
  padding: 10px 0;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.overview-item:hover {
  background: var(--brand-light);
}

.overview-item .num {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: var(--brand);
}

.overview-item .label {
  font-size: 12px;
  color: var(--text-secondary);
}

.all-order-btn {
  width: 100%;
  margin-top: 14px;
}

.quick-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
}

.quick-links a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  color: var(--text-regular);
  transition: all 0.2s;
}

.quick-links a:hover {
  background: var(--brand-light);
  color: var(--brand);
}

.main {
  flex: 1;
  background: #fff;
  border-radius: var(--radius);
  padding: 12px 28px 32px;
  box-shadow: var(--shadow-card);
  min-height: 520px;
}

.profile-tabs :deep(.el-tabs__header) {
  margin-bottom: 28px;
}

.form {
  max-width: 460px;
}

.avatar-uploader {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-uploader .tip {
  font-size: 12px;
  color: var(--text-placeholder);
}

.identity-alert {
  margin-bottom: 24px;
  max-width: 620px;
}

.verified-text {
  color: var(--text-secondary);
}

/* 收货地址 */
.address-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.address-tip {
  font-size: 13px;
  color: var(--text-secondary);
}

.address-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 780px;
  min-height: 120px;
}

.address-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  transition: all 0.2s;
}

.address-item:hover {
  border-color: var(--brand);
  box-shadow: 0 4px 14px rgba(255, 77, 33, 0.08);
}

.address-item.default {
  border-color: var(--brand);
  background: var(--brand-light);
}

.address-main {
  min-width: 0;
}

.address-line1 {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.address-name {
  font-size: 15px;
  font-weight: 700;
}

.address-phone {
  font-size: 14px;
  color: var(--text-regular);
}

.address-detail {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.address-actions {
  flex-shrink: 0;
  display: flex;
  gap: 4px;
}

@media (max-width: 900px) {
  .profile {
    flex-direction: column;
  }
  .side {
    width: 100%;
  }
}
</style>
