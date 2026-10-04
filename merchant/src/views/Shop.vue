<template>
  <div class="shop-page" v-loading="loading">
    <template v-if="shop">
      <!-- 审核状态 -->
      <el-card class="status-card">
        <div class="status-head">
          <div class="shop-brief">
            <el-avatar :size="56" shape="square" :src="resolveImage(shop.logo)">
              <el-icon size="24"><Shop /></el-icon>
            </el-avatar>
            <div>
              <h2>{{ shop.shop_name }}</h2>
              <p>{{ shop.business_category || '未填写经营类目' }}</p>
            </div>
          </div>
          <div class="status-right">
            <span class="status-label">审核状态</span>
            <el-tag :type="statusMeta.tag" effect="dark" round size="large">{{ statusMeta.text }}</el-tag>
          </div>
        </div>
        <el-alert
          v-if="shop.status === 'rejected'"
          type="error"
          :closable="false"
          show-icon
          class="reject-alert"
          :title="`审核未通过：${shop.reject_reason || '资质信息不符合要求'}`"
          description="请根据审核意见修改资料后保存，系统会自动重新提交审核。"
        />
        <el-descriptions :column="3" border class="desc">
          <el-descriptions-item label="联系人">{{ shop.contact_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ shop.contact_phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="营业执照号">{{ shop.business_license || '-' }}</el-descriptions-item>
          <el-descriptions-item label="店铺地址" :span="2">{{ shop.address || '-' }}</el-descriptions-item>
          <el-descriptions-item label="入驻时间">{{ formatDateTime(shop.created_at) }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 信息维护 -->
      <el-card class="form-card">
        <div class="page-header">
          <div>
            <div class="title">店铺基本信息维护</div>
            <div class="sub">修改后即时生效；若店铺处于被拒绝状态，保存将自动重新提交审核</div>
          </div>
        </div>
        <ShopForm :form="form" :loading="saving" submit-text="保存修改" :category-disabled="true" @submit="handleSave" />
      </el-card>
    </template>

    <el-card v-else-if="!loading">
      <el-empty description="你还没有店铺，请先提交入驻申请">
        <el-button type="primary" @click="$router.push('/apply')">去入驻</el-button>
      </el-empty>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ShopForm from '@/components/ShopForm.vue'
import { useShopStore } from '@/store/shop'
import { updateShop } from '@/api/shop'
import { resolveImage, formatDateTime, getShopStatus } from '@/utils/format'

const shopStore = useShopStore()

const loading = ref(false)
const saving = ref(false)
const shop = ref(null)

const form = reactive({
  shop_name: '',
  logo: '',
  description: '',
  business_category: '',
  category_id: null,
  contact_name: '',
  contact_phone: '',
  business_license: '',
  license_image: '',
  address: ''
})

const statusMeta = computed(() => getShopStatus(shop.value?.status))

const syncForm = () => {
  if (!shop.value) return
  Object.keys(form).forEach((key) => {
    form[key] = shop.value[key] ?? ''
  })
}

const handleSave = async () => {
  saving.value = true
  try {
    const res = await updateShop({ ...form })
    shopStore.setShop(res.data)
    shop.value = res.data
    syncForm()
    ElMessage.success(res.data.status === 'pending' ? '资料已保存，已重新提交审核' : '店铺信息已更新')
  } catch (error) {
    /* 已提示 */
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  await shopStore.loadShop()
  shop.value = shopStore.shop
  syncForm()
  loading.value = false
})
</script>

<style scoped>
.status-card,
.form-card {
  margin-bottom: 18px;
  border-radius: var(--radius);
  border: none;
  box-shadow: var(--shadow-card);
}

.status-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.shop-brief {
  display: flex;
  align-items: center;
  gap: 14px;
}

.shop-brief h2 {
  font-size: 19px;
  font-weight: 700;
}

.shop-brief p {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 13px;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-label {
  color: var(--text-secondary);
  font-size: 13px;
}

.reject-alert {
  margin-bottom: 18px;
}

.desc {
  margin-top: 4px;
}
</style>
