<template>
  <div class="after-sales-page">
    <!-- 概览 -->
    <div class="stat-grid">
      <div class="stat-card" v-for="item in statCards" :key="item.label">
        <div class="stat-icon" :style="{ background: item.bg, color: item.color }">
          <el-icon size="20"><component :is="item.icon" /></el-icon>
        </div>
        <div>
          <p class="stat-value">{{ item.value }}</p>
          <p class="stat-label">{{ item.label }}</p>
        </div>
      </div>
    </div>

    <el-card class="table-card">
      <div class="toolbar">
        <div class="filters">
          <el-input
            v-model="filters.keyword"
            placeholder="按订单号搜索"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select v-model="filters.status" placeholder="处理状态" clearable style="width: 140px" @change="handleSearch">
            <el-option label="待处理" value="pending" />
            <el-option label="已同意" value="approved" />
            <el-option label="已拒绝" value="rejected" />
            <el-option label="已完成" value="completed" />
          </el-select>
          <el-select v-model="filters.type" placeholder="售后类型" clearable style="width: 140px" @change="handleSearch">
            <el-option label="仅退款" value="refund" />
            <el-option label="退货退款" value="return" />
          </el-select>
          <el-checkbox v-model="filters.abnormal" @change="handleSearch">
            <span class="abnormal-label"><el-icon><Warning /></el-icon> 仅看异常售后</span>
          </el-checkbox>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>
      </div>

      <el-table :data="afterSales" v-loading="loading" stripe>
        <el-table-column label="售后单号" width="130">
          <template #default="{ row }">AS{{ String(row.id).padStart(8, '0') }}</template>
        </el-table-column>
        <el-table-column label="订单号" width="165">
          <template #default="{ row }">{{ row.order?.order_no || '-' }}</template>
        </el-table-column>
        <el-table-column label="商品" min-width="190">
          <template #default="{ row }">
            <div class="table-goods">
              <el-image :src="resolveImage(row.order?.product?.image)" fit="cover" class="table-goods-img">
                <template #error>
                  <div class="table-goods-img-fallback"><el-icon><Picture /></el-icon></div>
                </template>
              </el-image>
              <span class="ellipsis-2 goods-name">{{ row.order?.product?.name || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="申请用户" width="120">
          <template #default="{ row }">{{ row.user?.nickname || row.user?.username || '-' }}</template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'refund' ? 'warning' : 'danger'" effect="light">
              {{ AFTER_SALE_TYPE[row.type] || row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请原因" min-width="170">
          <template #default="{ row }">
            <span class="reason ellipsis-2">{{ row.reason }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="getAfterSaleStatus(row.status).tag" effect="light">
              {{ getAfterSaleStatus(row.status).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="是否异常" width="100">
          <template #default="{ row }">
            <el-tag v-if="isAbnormal(row)" type="danger" effect="light">异常</el-tag>
            <span v-else class="sub-text">正常</span>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="165">
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
          <el-empty description="暂无售后数据" :image-size="90" />
        </template>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="loadAfterSales"
        />
      </div>
    </el-card>

    <!-- 售后处理 -->
    <el-dialog v-model="processVisible" title="售后处理" width="540px">
      <template v-if="current">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="订单号">{{ current.order?.order_no || '-' }}</el-descriptions-item>
          <el-descriptions-item label="商品">{{ current.order?.product?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="申请用户">
            {{ current.user?.nickname || current.user?.username || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="售后类型">{{ AFTER_SALE_TYPE[current.type] || current.type }}</el-descriptions-item>
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
import { getAfterSales, processAfterSale } from '@/api/afterSale'
import { resolveImage, formatDateTime, getAfterSaleStatus, AFTER_SALE_TYPE } from '@/utils/format'

const afterSales = ref([])
const loading = ref(false)
const stats = ref({})

const filters = reactive({ keyword: '', status: '', type: '', abnormal: false })
const pagination = reactive({ page: 1, limit: 10, total: 0 })

const processVisible = ref(false)
const current = ref(null)
const submitting = ref(false)
const processForm = reactive({ status: 'approved', handle_remark: '' })

const statCards = computed(() => {
  const s = stats.value
  return [
    { label: '售后总数', value: s.total ?? 0, icon: 'Tickets', bg: '#eaf2ff', color: '#2f7bff' },
    { label: '待处理', value: s.pending ?? 0, icon: 'Clock', bg: '#fff7e6', color: '#ff8f1f' },
    { label: '已拒绝', value: s.rejected ?? 0, icon: 'CircleClose', bg: '#fff0f3', color: '#ff2c55' },
    { label: '已完成', value: s.completed ?? 0, icon: 'CircleCheck', bg: '#e8f8f2', color: '#00a870' },
    { label: '异常售后', value: s.abnormalCount ?? 0, icon: 'Warning', bg: '#fff0f3', color: '#ff2c55' }
  ]
})

// 与后端一致的异常判定：已拒绝，或超过 3 天仍待处理
const isAbnormal = (row) => {
  if (row.status === 'rejected') return true
  if (row.status === 'pending' && Date.now() - new Date(row.created_at).getTime() > 3 * 24 * 3600 * 1000) {
    return true
  }
  return false
}

const loadAfterSales = async () => {
  loading.value = true
  try {
    const params = { page: pagination.page, limit: pagination.limit }
    if (filters.status) params.status = filters.status
    if (filters.type) params.type = filters.type
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.abnormal) params.abnormal = 1

    const res = await getAfterSales(params)
    afterSales.value = res.data.afterSales || []
    stats.value = res.data.stats || {}
    pagination.total = res.data.pagination?.total || 0
  } catch (error) {
    afterSales.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadAfterSales()
}

const resetFilters = () => {
  filters.keyword = ''
  filters.status = ''
  filters.type = ''
  filters.abnormal = false
  pagination.page = 1
  loadAfterSales()
}

const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadAfterSales()
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
    loadAfterSales()
  } catch (error) {
    /* 已提示 */
  } finally {
    submitting.value = false
  }
}

onMounted(loadAfterSales)
</script>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: var(--shadow-card);
}

.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-value {
  font-size: 20px;
  font-weight: 800;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.table-card {
  border-radius: var(--radius);
  border: none;
  box-shadow: var(--shadow-card);
}

.abnormal-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #ff2c55;
}

.goods-name {
  font-size: 13px;
  line-height: 19px;
}

.reason {
  font-size: 13px;
  color: var(--text-regular);
}

.process-form {
  margin-top: 18px;
}
</style>
