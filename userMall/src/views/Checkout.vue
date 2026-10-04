<template>
  <div class="page">
    <div class="container" v-loading="loading">
      <div class="section-title"><h2>确认订单</h2></div>

      <template v-if="orderItems.length">
        <!-- 收货信息 -->
        <section class="card">
          <div class="card-title">
            <el-icon><Location /></el-icon> 收货信息
            <el-button
              text
              type="primary"
              class="manage-addr"
              @click="$router.push({ name: 'Profile', query: { tab: 'address' } })"
            >
              管理收货地址
            </el-button>
          </div>

          <!-- 已保存的收货地址：点击即刻带入下方表单 -->
          <div v-if="addresses.length" class="saved-address">
            <div
              v-for="addr in addresses"
              :key="addr.id"
              class="saved-item"
              :class="{ active: selectedAddressId === addr.id }"
              @click="applyAddress(addr)"
            >
              <div class="saved-top">
                <span class="saved-name">{{ addr.receiver_name }}</span>
                <span class="saved-phone">{{ addr.receiver_phone }}</span>
                <el-tag v-if="addr.is_default" size="small" type="danger" effect="light">默认</el-tag>
                <el-tag v-if="addr.tag" size="small" effect="plain">{{ addr.tag }}</el-tag>
              </div>
              <p class="saved-detail">{{ [addr.region, addr.detail_address].filter(Boolean).join(' ') }}</p>
              <el-icon v-if="selectedAddressId === addr.id" class="saved-check">
                <CircleCheckFilled />
              </el-icon>
            </div>
          </div>
          <el-empty
            v-else
            description="还没有收货地址，请先添加一个收货地址"
            :image-size="80"
            class="no-address-empty"
          >
            <el-button type="primary" @click="$router.push({ name: 'Profile', query: { tab: 'address' } })">
              去添加收货地址
            </el-button>
          </el-empty>
        </section>

        <!-- 商品清单 -->
        <section class="card">
          <div class="card-title"><el-icon><Goods /></el-icon> 商品清单</div>
          <div class="goods-list">
            <div v-for="item in orderItems" :key="item.product_id" class="goods-row">
              <el-image :src="resolveImage(item.product?.image)" fit="cover" class="goods-img">
                <template #error>
                  <div class="img-fallback"><el-icon><Picture /></el-icon></div>
                </template>
              </el-image>
              <div class="goods-info">
                <p class="goods-name ellipsis-2">{{ item.product?.name }}</p>
                <span class="goods-price price"><span class="price-symbol">¥</span>{{ formatPrice(item.product?.price) }}</span>
              </div>
              <span class="goods-qty">× {{ item.quantity }}</span>
              <span class="goods-subtotal price">
                <span class="price-symbol">¥</span>{{ formatPrice((item.product?.price || 0) * item.quantity) }}
              </span>
            </div>
          </div>
        </section>

        <!-- 备注 + 汇总 -->
        <section class="card">
          <div class="card-title"><el-icon><EditPen /></el-icon> 订单备注</div>
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            maxlength="200"
            show-word-limit
            placeholder="选填，如对发货时间、包装有特殊要求可在此说明"
          />
        </section>

        <div class="submit-bar">
          <div class="summary">
            <span>共 {{ totalQuantity }} 件商品</span>
            <span class="total-label">应付金额：</span>
            <span class="total price"><span class="price-symbol">¥</span>{{ formatPrice(totalAmount) }}</span>
          </div>
          <el-button
            type="primary"
            size="large"
            :loading="submitting"
            :disabled="!selectedAddressId"
            @click="submitOrder"
          >
            提交订单
          </el-button>
        </div>
      </template>

      <el-empty v-else-if="!loading" description="没有待结算的商品" class="empty-wrap">
        <el-button type="primary" @click="$router.push('/products')">去逛逛</el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProductById } from '@/api/product'
import { createOrder, batchCreateOrders } from '@/api/order'
import { getAddresses } from '@/api/address'
import { useCartStore } from '@/store/cart'
import { resolveImage, formatPrice } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()

const loading = ref(false)
const submitting = ref(false)
const orderItems = ref([])

const isCartMode = computed(() => route.query.mode === 'cart')

const form = reactive({
  receiver_name: '',
  receiver_phone: '',
  receiver_address: '',
  remark: ''
})

const totalQuantity = computed(() => orderItems.value.reduce((sum, i) => sum + i.quantity, 0))
const totalAmount = computed(() =>
  orderItems.value.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0)
)

/* -------------------- 收货地址自动带入 -------------------- */
const addresses = ref([])
const selectedAddressId = ref(null)

// 选中某个已保存地址后，自动填入收货人 / 手机号 / 地址
const applyAddress = (addr) => {
  selectedAddressId.value = addr.id
  form.receiver_name = addr.receiver_name
  form.receiver_phone = addr.receiver_phone
  form.receiver_address = [addr.region, addr.detail_address].filter(Boolean).join(' ')
}

// 拉取地址簿，并默认带入默认地址（无默认则取第一条）
const loadAddresses = async () => {
  try {
    const res = await getAddresses()
    addresses.value = res.data || []
    if (addresses.value.length) {
      applyAddress(addresses.value.find((a) => a.is_default) || addresses.value[0])
    }
  } catch (error) {
    addresses.value = []
  }
}

// 初始化待结算商品
const initItems = async () => {
  loading.value = true
  try {
    if (isCartMode.value) {
      orderItems.value = cartStore.checkoutItems.map((i) => ({ ...i }))
    } else {
      const id = route.query.product_id
      const quantity = Number(route.query.quantity) || 1
      const res = await getProductById(id)
      orderItems.value = [{ product_id: Number(id), quantity, product: res.data }]
    }
  } catch (error) {
    orderItems.value = []
  } finally {
    loading.value = false
  }
}

const submitOrder = async () => {
  if (!orderItems.value.length) return
  if (!selectedAddressId.value) {
    ElMessage.warning('请先选择收货地址')
    return
  }

  try {
    await ElMessageBox.confirm(`确认提交订单，应付金额 ¥${formatPrice(totalAmount.value)}？`, '提交订单', {
      confirmButtonText: '确认提交',
      cancelButtonText: '再想想',
      type: 'info'
    })
  } catch {
    return
  }

  submitting.value = true
  try {
    if (isCartMode.value) {
      await batchCreateOrders({
        items: orderItems.value.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        cart_ids: orderItems.value.map((i) => i.cart_id).filter(Boolean),
        receiver_name: form.receiver_name,
        receiver_phone: form.receiver_phone,
        receiver_address: form.receiver_address,
        remark: form.remark
      })
      cartStore.loadCart()
      cartStore.setCheckoutItems([])
      ElMessage.success('下单成功，请及时支付')
      router.replace({ name: 'Orders', query: { status: 'pending' } })
    } else {
      const res = await createOrder({
        product_id: orderItems.value[0].product_id,
        quantity: orderItems.value[0].quantity,
        receiver_name: form.receiver_name,
        receiver_phone: form.receiver_phone,
        receiver_address: form.receiver_address,
        remark: form.remark
      })
      ElMessage.success('下单成功，请及时支付')
      router.replace(`/orders/${res.data.id}`)
    }
  } catch (error) {
    /* 已提示 */
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await initItems()
  // 结算时自动带入默认收货地址
  await loadAddresses()
})
</script>

<style scoped>
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
  color: var(--text-primary);
}

.manage-addr {
  margin-left: auto;
  font-weight: 500;
}

/* 已保存收货地址 */
.saved-address {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.saved-item {
  position: relative;
  padding: 12px 40px 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.saved-item:hover {
  border-color: var(--brand);
}

.saved-item.active {
  border-color: var(--brand);
  background: var(--brand-light);
  box-shadow: 0 4px 14px rgba(255, 77, 33, 0.1);
}

.saved-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.saved-name {
  font-size: 14px;
  font-weight: 700;
}

.saved-phone {
  font-size: 13px;
  color: var(--text-regular);
}

.saved-detail {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.saved-check {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--brand);
  font-size: 20px;
}

.no-address-empty {
  margin-bottom: 8px;
  padding: 18px 0;
  background: #fafafa;
  border-radius: 8px;
}

.goods-list {
  display: flex;
  flex-direction: column;
}

.goods-row {
  display: grid;
  grid-template-columns: 72px 1fr 80px 120px;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border-color);
}

.goods-row:last-child {
  border-bottom: none;
}

.goods-img,
.img-fallback {
  width: 72px;
  height: 72px;
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
  max-height: 40px;
}

.goods-price {
  font-size: 14px;
  color: var(--text-secondary);
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

.submit-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 20px;
  padding: 18px 24px;
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  position: sticky;
  bottom: 12px;
}

.summary {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--text-regular);
}

.total-label {
  color: var(--text-regular);
}

.total {
  font-size: 26px;
}

.submit-bar .el-button {
  min-width: 150px;
  height: 46px;
}
</style>
