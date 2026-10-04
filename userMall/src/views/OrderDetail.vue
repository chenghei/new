<template>
  <div class="page">
    <div class="container" v-loading="loading">
      <el-breadcrumb class="breadcrumb" separator="/">
        <el-breadcrumb-item :to="{ path: '/orders' }">我的订单</el-breadcrumb-item>
        <el-breadcrumb-item>订单详情</el-breadcrumb-item>
      </el-breadcrumb>

      <template v-if="order">
        <!-- 状态进度 -->
        <section class="card status-card">
          <div class="status-head">
            <div>
              <span
                class="status-tag"
                :style="{ color: statusOf(order.status).color, background: statusOf(order.status).bg }"
              >
                {{ statusOf(order.status).text }}
              </span>
              <p class="status-desc">{{ statusDesc }}</p>
            </div>
            <OrderActionButtons :order="order" :reviewed="reviewed" @refresh="loadOrder" />
          </div>

          <el-steps
            v-if="order.status !== 'cancelled'"
            :active="stepActive"
            align-center
            class="steps"
            finish-status="success"
          >
            <el-step title="提交订单" :description="formatDateTime(order.created_at)" />
            <el-step title="支付成功" />
            <el-step title="商家发货" />
            <el-step title="确认收货" />
          </el-steps>
          <el-alert v-else title="该订单已取消" type="info" :closable="false" show-icon class="cancel-alert" />
        </section>

        <!-- 收货信息 -->
        <section class="card">
          <div class="card-title"><el-icon><Location /></el-icon> 收货信息</div>
          <div class="info-grid">
            <div class="info-item"><span class="label">收货人</span>{{ order.receiver_name || '-' }}</div>
            <div class="info-item"><span class="label">手机号</span>{{ order.receiver_phone || '-' }}</div>
            <div class="info-item full"><span class="label">收货地址</span>{{ order.receiver_address || '-' }}</div>
            <div class="info-item full"><span class="label">订单备注</span>{{ order.remark || '无' }}</div>
          </div>
        </section>

        <!-- 商品信息 -->
        <section class="card">
          <div class="card-title"><el-icon><Goods /></el-icon> 商品信息</div>
          <div class="goods-row" @click="order.product && $router.push(`/products/${order.product.id}`)">
            <el-image :src="resolveImage(order.product?.image)" fit="cover" class="goods-img">
              <template #error>
                <div class="img-fallback"><el-icon><Picture /></el-icon></div>
              </template>
            </el-image>
            <div class="goods-info">
              <p class="goods-name ellipsis-2">{{ order.product?.name || '商品已删除' }}</p>
              <p class="goods-spec">
                {{ order.product?.category?.name || '默认分类' }}
                <span v-if="order.product?.merchant">
                  · {{ order.product.merchant.nickname || order.product.merchant.username }}
                </span>
              </p>
            </div>
            <span class="goods-price price"><span class="price-symbol">¥</span>{{ formatPrice(order.product?.price) }}</span>
            <span class="goods-qty">×{{ order.quantity }}</span>
            <span class="goods-subtotal price">
              <span class="price-symbol">¥</span>{{ formatPrice(order.total_price) }}
            </span>
          </div>
        </section>

        <!-- 订单信息 -->
        <section class="card">
          <div class="card-title"><el-icon><Document /></el-icon> 订单信息</div>
          <div class="info-grid">
            <div class="info-item"><span class="label">订单编号</span>{{ order.order_no }}</div>
            <div class="info-item"><span class="label">下单时间</span>{{ formatDateTime(order.created_at) }}</div>
            <div class="info-item"><span class="label">商品总额</span>¥{{ formatPrice(order.total_price) }}</div>
            <div class="info-item"><span class="label">运费</span>¥0.00</div>
          </div>
          <div class="pay-total">
            实付款：<span class="price total"><span class="price-symbol">¥</span>{{ formatPrice(order.total_price) }}</span>
          </div>
        </section>

        <!-- 售后记录 -->
        <section v-if="afterSale" class="card">
          <div class="card-title"><el-icon><RefreshLeft /></el-icon> 售后记录</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">售后类型</span>{{ AFTER_SALE_TYPE[afterSale.type] || afterSale.type }}
            </div>
            <div class="info-item">
              <span class="label">处理状态</span>
              <span
                class="status-tag small"
                :style="{
                  color: getAfterSaleStatus(afterSale.status).color,
                  background: getAfterSaleStatus(afterSale.status).bg
                }"
              >
                {{ getAfterSaleStatus(afterSale.status).text }}
              </span>
            </div>
            <div class="info-item full"><span class="label">申请原因</span>{{ afterSale.reason }}</div>
            <div class="info-item full" v-if="afterSale.handle_remark">
              <span class="label">处理说明</span>{{ afterSale.handle_remark }}
            </div>
            <div class="info-item"><span class="label">申请时间</span>{{ formatDateTime(afterSale.created_at) }}</div>
          </div>
        </section>
      </template>

      <el-empty v-else-if="!loading" description="订单不存在" class="empty-wrap" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import OrderActionButtons from '@/components/OrderActionButtons.vue'
import { getOrderById } from '@/api/order'
import { checkReviewed } from '@/api/review'
import { getMyAfterSales } from '@/api/afterSale'
import {
  resolveImage,
  formatPrice,
  formatDateTime,
  getOrderStatus,
  getAfterSaleStatus,
  AFTER_SALE_TYPE
} from '@/utils/format'

const route = useRoute()

const order = ref(null)
const loading = ref(false)
const reviewed = ref(false)
const afterSale = ref(null)

const statusOf = getOrderStatus

const stepActive = computed(() => {
  const map = { pending: 1, paid: 2, shipped: 3, completed: 4 }
  return map[order.value?.status] ?? 0
})

const statusDesc = computed(() => {
  const map = {
    pending: '订单已提交，请尽快完成支付',
    paid: '商家正在备货，请耐心等待发货',
    shipped: '商品已发出，请及时确认收货',
    completed: '订单已完成，感谢你的支持',
    cancelled: '订单已取消'
  }
  return map[order.value?.status] || ''
})

const loadOrder = async () => {
  loading.value = true
  try {
    const res = await getOrderById(route.params.id)
    order.value = res.data
    await Promise.all([loadReviewed(), loadAfterSale()])
  } catch (error) {
    order.value = null
  } finally {
    loading.value = false
  }
}

const loadReviewed = async () => {
  try {
    const res = await checkReviewed(route.params.id)
    reviewed.value = res.data.reviewed
  } catch (error) {
    reviewed.value = false
  }
}

const loadAfterSale = async () => {
  try {
    const res = await getMyAfterSales()
    afterSale.value = (res.data || []).find((a) => a.order_id === Number(route.params.id)) || null
  } catch (error) {
    afterSale.value = null
  }
}

onMounted(loadOrder)
</script>

<style scoped>
.breadcrumb {
  margin-bottom: 16px;
}

.card {
  background: #fff;
  border-radius: var(--radius);
  padding: 20px 24px;
  box-shadow: var(--shadow-card);
  margin-bottom: 16px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 18px;
}

.status-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.status-tag {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
}

.status-tag.small {
  font-size: 12px;
  padding: 2px 10px;
}

.status-desc {
  margin-top: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

.steps {
  padding: 10px 0 4px;
}

.cancel-alert {
  margin-top: 8px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px 24px;
}

.info-item {
  display: flex;
  gap: 12px;
  font-size: 14px;
  color: var(--text-primary);
}

.info-item.full {
  grid-column: 1 / -1;
}

.info-item .label {
  width: 76px;
  flex-shrink: 0;
  color: var(--text-secondary);
}

.goods-row {
  display: grid;
  grid-template-columns: 76px 1fr 120px 70px 120px;
  align-items: center;
  gap: 14px;
  cursor: pointer;
}

.goods-img,
.img-fallback {
  width: 76px;
  height: 76px;
  border-radius: 10px;
}

.img-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #ccc;
}

.goods-name {
  font-size: 14px;
  line-height: 20px;
  margin-bottom: 6px;
}

.goods-spec {
  font-size: 12px;
  color: var(--text-secondary);
}

.goods-price {
  text-align: center;
  color: var(--text-regular);
  font-weight: 500;
}

.goods-qty {
  text-align: center;
  color: var(--text-secondary);
}

.goods-subtotal {
  text-align: right;
  font-size: 16px;
}

.pay-total {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed var(--border-color);
  text-align: right;
  color: var(--text-regular);
}

.pay-total .total {
  font-size: 24px;
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
  .status-head {
    flex-direction: column;
    align-items: flex-start;
  }
  .goods-row {
    grid-template-columns: 76px 1fr;
    row-gap: 10px;
  }
}
</style>
