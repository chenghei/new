<template>
  <div class="page">
    <div class="container">
      <div class="section-title"><h2>我的订单</h2></div>

      <div class="order-tabs">
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

      <div v-loading="loading" class="order-list">
        <div v-for="order in orders" :key="order.id" class="order-card">
          <div class="order-head">
            <span class="order-no">订单号：{{ order.order_no }}</span>
            <span class="order-time">{{ formatDateTime(order.created_at) }}</span>
            <span
              class="status-tag"
              :style="{ color: statusOf(order.status).color, background: statusOf(order.status).bg }"
            >
              {{ statusOf(order.status).text }}
            </span>
          </div>

          <div class="order-body">
            <div class="product-cell" @click="$router.push(`/orders/${order.id}`)">
              <el-image :src="resolveImage(order.product?.image)" fit="cover" class="product-img">
                <template #error>
                  <div class="img-fallback"><el-icon><Picture /></el-icon></div>
                </template>
              </el-image>
              <div class="product-info">
                <p class="product-name ellipsis-2">{{ order.product?.name || '商品已删除' }}</p>
                <p class="product-spec">
                  {{ order.product?.category?.name || '默认分类' }}
                  <span class="merchant" v-if="order.product?.merchant">
                    · {{ order.product.merchant.nickname || order.product.merchant.username }}
                  </span>
                </p>
              </div>
            </div>

            <div class="price-cell">
              <span class="price"><span class="price-symbol">¥</span>{{ formatPrice(order.product?.price) }}</span>
              <span class="qty">×{{ order.quantity }}</span>
            </div>

            <div class="total-cell">
              <span class="total-label">实付款</span>
              <span class="total price"><span class="price-symbol">¥</span>{{ formatPrice(order.total_price) }}</span>
            </div>

            <div class="action-cell">
              <OrderActionButtons
                :order="order"
                :reviewed="reviewedIds.has(order.id)"
                @refresh="loadOrders"
              />
            </div>
          </div>

          <div class="order-foot">
            <el-button text type="primary" @click="$router.push(`/orders/${order.id}`)">
              查看订单详情 <el-icon><ArrowRight /></el-icon>
            </el-button>
            <span v-if="order.receiver_name" class="receiver">
              收货人：{{ order.receiver_name }} {{ order.receiver_phone }}
            </span>
          </div>
        </div>

        <el-empty v-if="!loading && !orders.length" description="暂无相关订单" class="empty-wrap">
          <el-button type="primary" @click="$router.push('/products')">去购物</el-button>
        </el-empty>
      </div>

      <div v-if="pagination.total > 0" class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          :page-size="pagination.limit"
          :total="pagination.total"
          layout="prev, pager, next, total"
          background
          @current-change="loadOrders"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OrderActionButtons from '@/components/OrderActionButtons.vue'
import { getOrders } from '@/api/order'
import { getMyReviews } from '@/api/review'
import { resolveImage, formatPrice, formatDateTime, getOrderStatus } from '@/utils/format'

const route = useRoute()
const router = useRouter()

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
const activeStatus = ref('')
const reviewedIds = ref(new Set())
const pagination = reactive({ page: 1, limit: 10, total: 0 })

const statusOf = getOrderStatus

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

const loadReviewed = async () => {
  try {
    const res = await getMyReviews()
    reviewedIds.value = new Set((res.data || []).map((r) => r.order_id))
  } catch (error) {
    reviewedIds.value = new Set()
  }
}

const changeStatus = (value) => {
  router.replace({ name: 'Orders', query: value ? { status: value } : {} })
}

watch(
  () => route.query.status,
  (val) => {
    activeStatus.value = val || ''
    pagination.page = 1
    loadOrders()
  }
)

onMounted(() => {
  activeStatus.value = route.query.status || ''
  loadOrders()
  loadReviewed()
})
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

.order-list {
  min-height: 200px;
}

.order-card {
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  margin-bottom: 16px;
  overflow: hidden;
}

.order-head {
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

.order-body {
  display: grid;
  grid-template-columns: 1fr 130px 130px auto;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
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
  width: 76px;
  height: 76px;
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
  transition: color 0.2s;
}

.product-name:hover {
  color: var(--brand);
}

.product-spec {
  font-size: 12px;
  color: var(--text-secondary);
}

.price-cell,
.total-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.price-cell .price {
  font-size: 15px;
  color: var(--text-regular);
  font-weight: 500;
}

.price-cell .qty {
  font-size: 12px;
  color: var(--text-secondary);
}

.total-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.total-cell .total {
  font-size: 18px;
}

.action-cell {
  justify-self: end;
}

.order-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px 14px;
  border-top: 1px solid var(--border-color);
}

.receiver {
  font-size: 12px;
  color: var(--text-secondary);
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

@media (max-width: 900px) {
  .order-body {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .price-cell,
  .total-cell {
    flex-direction: row;
    justify-content: space-between;
  }
  .action-cell {
    justify-self: stretch;
  }
}
</style>
