<template>
  <div class="apply-page" v-loading="loading">
    <!-- 未入驻：入驻须知 + 申请表单 -->
    <template v-if="!shop">
      <el-card class="notice-card">
        <div class="notice">
          <div class="notice-icon"><el-icon size="34"><Shop /></el-icon></div>
          <div class="notice-body">
            <h2>欢迎入驻优选商城</h2>
            <p>
              提交店铺基本信息与资质证件后，平台将在 1-3 个工作日内完成审核。
              审核通过后即可使用商品管理、订单处理、数据统计等全部商家功能。
            </p>
            <div class="steps">
              <div class="step"><span>1</span> 提交资质</div>
              <el-icon><ArrowRight /></el-icon>
              <div class="step"><span>2</span> 平台审核</div>
              <el-icon><ArrowRight /></el-icon>
              <div class="step"><span>3</span> 开店经营</div>
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="form-card">
        <div class="page-header">
          <div>
            <div class="title">填写入驻申请</div>
            <div class="sub">带 * 的为必填项，资质证件请上传清晰图片</div>
          </div>
        </div>
        <ShopForm :form="form" :loading="submitting" submit-text="提交入驻申请" @submit="handleApply" />
      </el-card>
    </template>

    <!-- 审核中 -->
    <el-card v-else-if="shop.status === 'pending'">
      <el-result icon="warning" title="入驻申请审核中" sub-title="平台正在审核你提交的资质信息，请耐心等待">
        <template #extra>
          <el-button type="primary" @click="refresh">刷新审核状态</el-button>
        </template>
      </el-result>
      <el-descriptions :column="2" border class="desc">
        <el-descriptions-item label="店铺名称">{{ shop.shop_name }}</el-descriptions-item>
        <el-descriptions-item label="经营类目">{{ shop.business_category || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ shop.contact_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ shop.contact_phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="营业执照号">{{ shop.business_license || '-' }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ formatDateTime(shop.created_at) }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 审核拒绝：展示原因并允许修改后重新提交 -->
    <template v-else-if="shop.status === 'rejected'">
      <el-card class="notice-card">
        <el-result icon="error" title="入驻申请未通过" :sub-title="shop.reject_reason || '资质信息不符合要求'">
        </el-result>
      </el-card>
      <el-card class="form-card">
        <div class="page-header">
          <div>
            <div class="title">修改资料并重新提交</div>
            <div class="sub">根据审核意见完善信息后重新提交审核</div>
          </div>
        </div>
        <ShopForm :form="form" :loading="submitting" submit-text="重新提交审核" @submit="handleApply" />
      </el-card>
    </template>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import ShopForm from '@/components/ShopForm.vue'
import { useShopStore } from '@/store/shop'
import { applyShop, updateShop } from '@/api/shop'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const shopStore = useShopStore()

const loading = ref(false)
const submitting = ref(false)

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

const shop = ref(null)

const syncForm = () => {
  if (!shop.value) return
  Object.keys(form).forEach((key) => {
    form[key] = shop.value[key] ?? ''
  })
}

const refresh = async () => {
  loading.value = true
  await shopStore.loadShop()
  shop.value = shopStore.shop
  syncForm()
  loading.value = false
  ElMessage.success('已刷新审核状态')
  router.replace('/dashboard')
}

const handleApply = async () => {
  submitting.value = true
  try {
    const res = shopStore.shop ? await updateShop(form) : await applyShop(form)
    shopStore.setShop(res.data)
    shop.value = res.data
    syncForm()
    ElMessage.success(shopStore.shop ? '已提交，请等待审核' : '入驻申请已提交，请等待审核')
    if (res.data.status === 'approved') {
      router.replace('/dashboard')
    }
  } catch (error) {
    /* 已提示 */
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  loading.value = true
  if (!shopStore.loaded) {
    await shopStore.loadShop()
  }
  shop.value = shopStore.shop
  syncForm()
  loading.value = false

  if (shop.value?.status === 'approved') {
    router.replace('/dashboard')
  }
})
</script>

<style scoped>
.apply-page {
  max-width: 1000px;
  margin: 0 auto;
}

.notice-card,
.form-card {
  margin-bottom: 18px;
  border-radius: var(--radius);
  border: none;
  box-shadow: var(--shadow-card);
}

.notice {
  display: flex;
  gap: 20px;
}

.notice-icon {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 16px;
  background: var(--brand-light);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
}

.notice-body h2 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
}

.notice-body p {
  color: var(--text-regular);
  line-height: 1.8;
}

.steps {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
  color: var(--text-secondary);
}

.step {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.step span {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--brand-gradient);
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.desc {
  max-width: 760px;
  margin: 0 auto 20px;
}
</style>
