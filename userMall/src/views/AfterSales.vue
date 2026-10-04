<template>
  <div class="page">
    <div class="container">
      <div class="section-title">
        <h2>退款 / 售后</h2>
        <span class="more" @click="$router.push('/orders')">去订单申请售后 <el-icon><ArrowRight /></el-icon></span>
      </div>

      <div class="order-tabs">
        <span
          v-for="tab in statusTabs"
          :key="tab.value"
          class="tab-item"
          :class="{ active: activeStatus === tab.value }"
          @click="activeStatus = tab.value"
        >
          {{ tab.label }}
        </span>
      </div>

      <div v-loading="loading" class="after-list">
        <div v-for="record in filteredRecords" :key="record.id" class="after-card">
          <div class="after-head">
            <span class="order-no">售后单号：AS{{ String(record.id).padStart(8, '0') }}</span>
            <span class="order-time">{{ formatDateTime(record.created_at) }}</span>
            <span
              class="status-tag"
              :style="{
                color: getAfterSaleStatus(record.status).color,
                background: getAfterSaleStatus(record.status).bg
              }"
            >
              {{ getAfterSaleStatus(record.status).text }}
            </span>
          </div>

          <div class="after-body">
            <div class="product-cell" @click="$router.push(`/orders/${record.order_id}`)">
              <el-image :src="resolveImage(record.order?.product?.image)" fit="cover" class="product-img">
                <template #error>
                  <div class="img-fallback"><el-icon><Picture /></el-icon></div>
                </template>
              </el-image>
              <div class="product-info">
                <p class="product-name ellipsis-2">{{ record.order?.product?.name || '商品已删除' }}</p>
                <p class="product-spec">
                  关联订单：{{ record.order?.order_no || record.order_id }}
                </p>
              </div>
            </div>

            <div class="type-cell">
              <el-tag :type="record.type === 'refund' ? 'warning' : 'danger'" effect="plain" size="small">
                {{ AFTER_SALE_TYPE[record.type] || record.type }}
              </el-tag>
            </div>

            <div class="action-cell">
              <el-button v-if="record.status === 'pending'" size="small" @click="handleCancel(record)">
                撤销申请
              </el-button>
              <el-button size="small" text type="primary" @click="$router.push(`/orders/${record.order_id}`)">
                查看订单
              </el-button>
            </div>
          </div>

          <div class="after-detail">
            <p><span class="label">申请原因：</span>{{ record.reason }}</p>
            <p v-if="record.handle_remark" class="remark">
              <span class="label">处理说明：</span>{{ record.handle_remark }}
            </p>
          </div>
        </div>

        <el-empty v-if="!loading && !filteredRecords.length" description="暂无售后记录" class="empty-wrap">
          <el-button type="primary" @click="$router.push('/orders')">去订单申请售后</el-button>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMyAfterSales, cancelAfterSale } from '@/api/afterSale'
import { resolveImage, formatDateTime, getAfterSaleStatus, AFTER_SALE_TYPE } from '@/utils/format'

const statusTabs = [
  { label: '全部', value: '' },
  { label: '待处理', value: 'pending' },
  { label: '已同意', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已完成', value: 'completed' }
]

const records = ref([])
const loading = ref(false)
const activeStatus = ref('')

const filteredRecords = computed(() =>
  activeStatus.value ? records.value.filter((r) => r.status === activeStatus.value) : records.value
)

const loadRecords = async () => {
  loading.value = true
  try {
    const res = await getMyAfterSales()
    records.value = res.data || []
  } catch (error) {
    records.value = []
  } finally {
    loading.value = false
  }
}

const handleCancel = async (record) => {
  try {
    await ElMessageBox.confirm('确定要撤销该售后申请吗？', '撤销申请', {
      confirmButtonText: '确定撤销',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await cancelAfterSale(record.id)
    ElMessage.success('售后申请已撤销')
    loadRecords()
  } catch (error) {
    /* 已提示 */
  }
}

onMounted(loadRecords)
</script>

<style scoped>
.order-tabs {
  display: flex;
  gap: 6px;
  background: #fff;
  border-radius: var(--radius);
  padding: 8px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-card);
  overflow-x: auto;
}

.tab-item {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-regular);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab-item:hover {
  color: var(--brand);
}

.tab-item.active {
  color: #fff;
  background: var(--brand-gradient);
  font-weight: 600;
}

.after-list {
  min-height: 200px;
}

.after-card {
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  margin-bottom: 16px;
  overflow: hidden;
}

.after-head {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 14px 20px;
  background: #fafafa;
  font-size: 13px;
  color: var(--text-secondary);
}

.order-no {
  font-weight: 600;
  color: var(--text-regular);
}

.status-tag {
  margin-left: auto;
  padding: 3px 12px;
  border-radius: 12px;
  font-weight: 600;
}

.after-body {
  display: grid;
  grid-template-columns: 1fr 120px auto;
  align-items: center;
  gap: 16px;
  padding: 18px 20px 12px;
}

.product-cell {
  display: flex;
  gap: 14px;
  align-items: center;
  cursor: pointer;
  min-width: 0;
}

.product-img,
.img-fallback {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  flex-shrink: 0;
}

.img-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #ccc;
}

.product-info {
  min-width: 0;
}

.product-name {
  font-size: 14px;
  line-height: 20px;
  margin-bottom: 6px;
}

.product-name:hover {
  color: var(--brand);
}

.product-spec {
  font-size: 12px;
  color: var(--text-secondary);
}

.type-cell {
  text-align: center;
}

.action-cell {
  justify-self: end;
}

.after-detail {
  padding: 0 20px 18px;
  font-size: 13px;
  color: var(--text-regular);
  line-height: 1.8;
}

.after-detail .label {
  color: var(--text-secondary);
}

.after-detail .remark {
  color: #8a5cf6;
}

@media (max-width: 768px) {
  .after-body {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .type-cell {
    text-align: left;
  }
  .action-cell {
    justify-self: start;
  }
}
</style>
