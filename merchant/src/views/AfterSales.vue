<template>
  <div class="after-sales-page">
    <el-card class="tab-card">
      <div class="status-tabs">
        <span
          v-for="tab in statusTabs"
          :key="tab.value"
          class="tab-item"
          :class="{ active: activeStatus === tab.value }"
          @click="activeStatus = tab.value"
        >
          {{ tab.label }}
          <span class="count">{{ tab.value ? countOf(tab.value) : list.length }}</span>
        </span>
      </div>
    </el-card>

    <el-card class="table-card">
      <el-table :data="filteredList" v-loading="loading" stripe>
        <el-table-column label="售后单号" width="140">
          <template #default="{ row }">AS{{ String(row.id).padStart(8, '0') }}</template>
        </el-table-column>
        <el-table-column label="商品信息" min-width="220">
          <template #default="{ row }">
            <div class="table-goods">
              <el-image :src="resolveImage(row.order?.product?.image)" fit="cover" class="table-goods-img">
                <template #error>
                  <div class="table-goods-img-fallback"><el-icon><Picture /></el-icon></div>
                </template>
              </el-image>
              <div class="goods-meta">
                <p class="goods-name ellipsis-2">{{ row.order?.product?.name || '商品已删除' }}</p>
                <p class="goods-sub">订单号：{{ row.order?.order_no || row.order_id }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="买家" width="120">
          <template #default="{ row }">{{ row.user?.nickname || row.user?.username || '-' }}</template>
        </el-table-column>
        <el-table-column label="售后类型" width="110">
          <template #default="{ row }">
            <el-tag :type="row.type === 'refund' ? 'warning' : 'danger'" effect="light">
              {{ AFTER_SALE_TYPE[row.type] || row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请原因" min-width="180">
          <template #default="{ row }">
            <span class="reason ellipsis-2">{{ row.reason }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getAfterSaleStatus(row.status).tag" effect="light">
              {{ getAfterSaleStatus(row.status).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openProcess(row)">
              {{ row.status === 'pending' ? '处理' : '查看' }}
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无售后申请" :image-size="90" />
        </template>
      </el-table>
    </el-card>

    <!-- 处理售后 -->
    <el-dialog v-model="processVisible" title="处理售后申请" width="520px">
      <template v-if="current">
        <el-descriptions :column="1" border class="process-desc">
          <el-descriptions-item label="商品">{{ current.order?.product?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="售后类型">
            {{ AFTER_SALE_TYPE[current.type] || current.type }}
          </el-descriptions-item>
          <el-descriptions-item label="申请原因">{{ current.reason }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="getAfterSaleStatus(current.status).tag" effect="light">
              {{ getAfterSaleStatus(current.status).text }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="current.handle_remark" label="处理说明">
            {{ current.handle_remark }}
          </el-descriptions-item>
        </el-descriptions>

        <el-form v-if="current.status === 'pending'" :model="processForm" label-width="80px" class="process-form">
          <el-form-item label="处理结果">
            <el-radio-group v-model="processForm.status">
              <el-radio label="approved">同意申请</el-radio>
              <el-radio label="rejected">拒绝申请</el-radio>
              <el-radio label="completed">完成退款/退货</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="处理说明">
            <el-input
              v-model="processForm.handle_remark"
              type="textarea"
              :rows="3"
              maxlength="200"
              show-word-limit
              :placeholder="processForm.status === 'rejected' ? '请说明拒绝原因（必填）' : '可填写处理说明（选填）'"
            />
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="processVisible = false">关闭</el-button>
        <el-button
          v-if="current?.status === 'pending'"
          type="primary"
          :loading="submitting"
          @click="submitProcess"
        >
          提交处理
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getMerchantAfterSales, processAfterSale } from '@/api/afterSale'
import { resolveImage, formatDateTime, getAfterSaleStatus, AFTER_SALE_TYPE } from '@/utils/format'

const statusTabs = [
  { label: '全部', value: '' },
  { label: '待处理', value: 'pending' },
  { label: '已同意', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已完成', value: 'completed' }
]

const list = ref([])
const loading = ref(false)
const activeStatus = ref('')

const processVisible = ref(false)
const current = ref(null)
const submitting = ref(false)
const processForm = reactive({ status: 'approved', handle_remark: '' })

const filteredList = computed(() =>
  activeStatus.value ? list.value.filter((r) => r.status === activeStatus.value) : list.value
)

const countOf = (status) => list.value.filter((r) => r.status === status).length

const loadList = async () => {
  loading.value = true
  try {
    const res = await getMerchantAfterSales()
    list.value = res.data || []
  } catch (error) {
    list.value = []
  } finally {
    loading.value = false
  }
}

const openProcess = (row) => {
  current.value = row
  processForm.status = 'approved'
  processForm.handle_remark = ''
  processVisible.value = true
}

const submitProcess = async () => {
  if (processForm.status === 'rejected' && !processForm.handle_remark.trim()) {
    ElMessage.warning('拒绝申请时请填写处理说明')
    return
  }
  submitting.value = true
  try {
    await processAfterSale(current.value.id, {
      status: processForm.status,
      handle_remark: processForm.handle_remark
    })
    ElMessage.success('售后处理完成')
    processVisible.value = false
    loadList()
  } catch (error) {
    /* 已提示 */
  } finally {
    submitting.value = false
  }
}

onMounted(loadList)
</script>

<style scoped>
.tab-card,
.table-card {
  border-radius: var(--radius);
  border: none;
  box-shadow: var(--shadow-card);
}

.tab-card {
  margin-bottom: 14px;
}

.status-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
}

.tab-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
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

.tab-item .count {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.08);
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tab-item.active .count {
  background: rgba(255, 255, 255, 0.25);
}

.goods-meta {
  min-width: 0;
}

.goods-name {
  font-size: 14px;
  line-height: 20px;
}

.goods-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-secondary);
}

.reason {
  color: var(--text-regular);
  font-size: 13px;
}

.process-desc {
  margin-bottom: 18px;
}
</style>
