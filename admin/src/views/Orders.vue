<template>
  <div class="orders-page">
    <el-card class="tab-card">
      <div class="status-tabs">
        <span
          v-for="tab in statusTabs"
          :key="tab.value"
          class="tab-item"
          :class="{ active: activeStatus === tab.value }"
          @click="changeStatus(tab.value)"
        >
          {{ tab.label }}
        </span>
      </div>
    </el-card>

    <el-card class="table-card">
      <el-table :data="orders" v-loading="loading" stripe>
        <el-table-column label="订单号" width="170">
          <template #default="{ row }">
            <span class="order-no">{{ row.order_no }}</span>
          </template>
        </el-table-column>
        <el-table-column label="商品" min-width="210">
          <template #default="{ row }">
            <div class="table-goods">
              <el-image :src="resolveImage(row.product?.image)" fit="cover" class="table-goods-img">
                <template #error>
                  <div class="table-goods-img-fallback"><el-icon><Picture /></el-icon></div>
                </template>
              </el-image>
              <div class="goods-meta">
                <p class="goods-name ellipsis-2">{{ row.product?.name || '商品已删除' }}</p>
                <p class="sub-text">¥{{ formatPrice(row.product?.price) }} × {{ row.quantity }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="买家" width="120">
          <template #default="{ row }">{{ row.user?.nickname || row.user?.username || '-' }}</template>
        </el-table-column>
        <el-table-column label="商家" width="120">
          <template #default="{ row }">
            {{ row.product?.merchant?.nickname || row.product?.merchant?.username || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="金额" width="110">
          <template #default="{ row }"><span class="price">¥{{ formatPrice(row.total_price) }}</span></template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getOrderStatus(row.status).tag" effect="light">
              {{ getOrderStatus(row.status).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">监管</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无订单数据" :image-size="90" />
        </template>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          :page-size="pagination.limit"
          :total="pagination.total"
          layout="total, prev, pager, next"
          background
          @current-change="loadOrders"
        />
      </div>
    </el-card>

    <!-- 订单监管 -->
    <el-dialog v-model="detailVisible" title="订单监管" width="600px">
      <template v-if="current">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单号" :span="2">{{ current.order_no }}</el-descriptions-item>
          <el-descriptions-item label="买家">
            {{ current.user?.nickname || current.user?.username || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="商家">
            {{ current.product?.merchant?.nickname || current.product?.merchant?.username || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="收货人">{{ current.receiver_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ current.receiver_phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="收货地址" :span="2">{{ current.receiver_address || '-' }}</el-descriptions-item>
          <el-descriptions-item label="订单金额">
            <span class="price">¥{{ formatPrice(current.total_price) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="下单时间">{{ formatDateTime(current.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="订单备注" :span="2">{{ current.remark || '无' }}</el-descriptions-item>
        </el-descriptions>

        <el-form :model="statusForm" label-width="90px" class="status-form">
          <el-form-item label="订单状态监管">
            <el-select v-model="statusForm.status" style="width: 200px">
              <el-option v-for="tab in statusTabs.slice(1)" :key="tab.value" :label="tab.label" :value="tab.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input
              v-model="statusForm.remark"
              type="textarea"
              :rows="2"
              maxlength="200"
              show-word-limit
              placeholder="可填写状态变更说明（选填）"
            />
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button type="primary" :loading="saving" @click="submitStatus">保存状态</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOrders, updateOrderStatus } from '@/api/order'
import { resolveImage, formatPrice, formatDateTime, getOrderStatus } from '@/utils/format'

const statusTabs = [
  { label: '全部', value: '' },
  { label: '待支付', value: 'pending' },
  { label: '待发货', value: 'paid' },
  { label: '待收货', value: 'shipped' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' }
]

const orders = ref([])
const loading = ref(false)
const saving = ref(false)
const activeStatus = ref('')
const detailVisible = ref(false)
const current = ref(null)
const pagination = reactive({ page: 1, limit: 10, total: 0 })
const statusForm = reactive({ status: '', remark: '' })

const loadOrders = async () => {
  loading.value = true
  try {
    const params = { page: pagination.page, limit: pagination.limit }
    if (activeStatus.value) params.status = activeStatus.value
    const res = await getOrders(params)
    orders.value = res.data.orders || []
    pagination.total = res.data.pagination?.total || 0
  } catch (error) {
    orders.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const changeStatus = (value) => {
  activeStatus.value = value
  pagination.page = 1
  loadOrders()
}

const openDetail = (row) => {
  current.value = row
  statusForm.status = row.status
  statusForm.remark = ''
  detailVisible.value = true
}

const submitStatus = async () => {
  if (statusForm.status === current.value.status && !statusForm.remark) {
    ElMessage.info('状态未发生变化')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定将订单「${current.value.order_no}」状态调整为「${getOrderStatus(statusForm.status).text}」吗？`,
      '订单状态监管',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  saving.value = true
  try {
    await updateOrderStatus(current.value.id, {
      status: statusForm.status,
      remark: statusForm.remark
    })
    ElMessage.success('订单状态已更新')
    detailVisible.value = false
    loadOrders()
  } catch (error) {
    /* 已提示 */
  } finally {
    saving.value = false
  }
}

onMounted(loadOrders)
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
  padding: 7px 18px;
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

.order-no {
  font-weight: 600;
  font-size: 13px;
}

.goods-meta {
  min-width: 0;
}

.goods-name {
  font-size: 14px;
  line-height: 20px;
}

.status-form {
  margin-top: 18px;
}
</style>
