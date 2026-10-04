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
        <el-table-column label="商品信息" min-width="240">
          <template #default="{ row }">
            <div class="table-goods">
              <el-image :src="resolveImage(row.product?.image)" fit="cover" class="table-goods-img">
                <template #error>
                  <div class="table-goods-img-fallback"><el-icon><Picture /></el-icon></div>
                </template>
              </el-image>
              <div class="goods-meta">
                <p class="goods-name ellipsis-2">{{ row.product?.name || '商品已删除' }}</p>
                <p class="goods-sub">¥{{ formatPrice(row.product?.price) }} × {{ row.quantity }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="买家" width="130">
          <template #default="{ row }">
            <div>{{ row.user?.nickname || row.user?.username || '-' }}</div>
            <div class="sub-text">{{ row.receiver_phone || '' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="实付金额" width="120">
          <template #default="{ row }">
            <span class="price">¥{{ formatPrice(row.total_price) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="订单状态" width="110">
          <template #default="{ row }">
            <el-tag :type="getOrderStatus(row.status).tag" effect="light">
              {{ getOrderStatus(row.status).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'paid'" link type="primary" @click="handleShip(row)">
              发货
            </el-button>
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无订单" :image-size="90" />
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

    <!-- 订单详情 -->
    <el-dialog v-model="detailVisible" title="订单详情" width="600px">
      <template v-if="current">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单号" :span="2">{{ current.order_no }}</el-descriptions-item>
          <el-descriptions-item label="订单状态">
            <el-tag :type="getOrderStatus(current.status).tag" effect="light">
              {{ getOrderStatus(current.status).text }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="下单时间">{{ formatDateTime(current.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="收货人">{{ current.receiver_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ current.receiver_phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="收货地址" :span="2">{{ current.receiver_address || '-' }}</el-descriptions-item>
          <el-descriptions-item label="订单备注" :span="2">{{ current.remark || '无' }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-goods">
          <el-image :src="resolveImage(current.product?.image)" fit="cover" class="detail-img">
            <template #error>
              <div class="detail-img-fallback"><el-icon><Picture /></el-icon></div>
            </template>
          </el-image>
          <div class="detail-goods-info">
            <p class="ellipsis-2">{{ current.product?.name }}</p>
            <p class="sub-text">单价：¥{{ formatPrice(current.product?.price) }} × {{ current.quantity }}</p>
          </div>
          <span class="price">¥{{ formatPrice(current.total_price) }}</span>
        </div>
      </template>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button v-if="current?.status === 'paid'" type="primary" @click="handleShip(current)">
          立即发货
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOrders, updateOrderStatus } from '@/api/order'
import { useUserStore } from '@/store/user'
import { resolveImage, formatPrice, formatDateTime, getOrderStatus } from '@/utils/format'

const userStore = useUserStore()

const statusTabs = [
  { label: '全部', value: '' },
  { label: '待发货', value: 'paid' },
  { label: '待收货', value: 'shipped' },
  { label: '已完成', value: 'completed' },
  { label: '待支付', value: 'pending' },
  { label: '已取消', value: 'cancelled' }
]

const orders = ref([])
const loading = ref(false)
const activeStatus = ref('')
const pagination = reactive({ page: 1, limit: 10, total: 0 })

const detailVisible = ref(false)
const current = ref(null)

const loadOrders = async () => {
  loading.value = true
  try {
    const params = { page: pagination.page, limit: pagination.limit }
    if (activeStatus.value) params.status = activeStatus.value
    const res = await getOrders(params)
    // 仅保留本商家商品的订单
    orders.value = (res.data.orders || []).filter(
      (o) => o.product && o.product.user_id === userStore.userInfo?.id
    )
    pagination.total = orders.value.length
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
  detailVisible.value = true
}

const handleShip = async (row) => {
  try {
    await ElMessageBox.confirm(`确认对订单「${row.order_no}」进行发货？`, '订单发货', {
      confirmButtonText: '确认发货',
      cancelButtonText: '取消',
      type: 'info'
    })
  } catch {
    return
  }
  try {
    await updateOrderStatus(row.id, { status: 'shipped' })
    ElMessage.success('发货成功，订单状态已更新为待收货')
    detailVisible.value = false
    loadOrders()
  } catch (error) {
    /* 已提示 */
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

.goods-sub,
.sub-text {
  font-size: 12px;
  color: var(--text-secondary);
}

.sub-text {
  margin-top: 2px;
}

.price {
  color: var(--price-color);
  font-weight: 700;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.detail-goods {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
  padding: 14px;
  border-radius: 10px;
  background: #f7f8fa;
}

.detail-img,
.detail-img-fallback {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  flex-shrink: 0;
}

.detail-img-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eee;
  color: #c8c8c8;
}

.detail-goods-info {
  flex: 1;
  min-width: 0;
}
</style>
