<template>
  <div class="page">
    <div class="container">
      <div class="section-title"><h2>我的购物车</h2></div>

      <div v-loading="loading" class="cart-wrap">
        <template v-if="items.length">
          <!-- 表头 -->
          <div class="cart-head">
            <el-checkbox
              :model-value="allSelected"
              :indeterminate="indeterminate"
              @change="toggleAll"
            >
              全选
            </el-checkbox>
            <span class="col-goods">商品信息</span>
            <span class="col-price">单价</span>
            <span class="col-qty">数量</span>
            <span class="col-subtotal">小计</span>
            <span class="col-action">操作</span>
          </div>

          <!-- 商品行 -->
          <div v-for="item in items" :key="item.id" class="cart-row">
            <el-checkbox
              :model-value="selectedIds.includes(item.id)"
              @change="(val) => toggleItem(item.id, val)"
            />
            <div class="goods" @click="goProduct(item)">
              <el-image :src="resolveImage(item.product?.image)" fit="cover" class="goods-img">
                <template #error>
                  <div class="img-fallback"><el-icon><Picture /></el-icon></div>
                </template>
              </el-image>
              <div class="goods-info">
                <p class="goods-name ellipsis-2">{{ item.product?.name || '商品已下架' }}</p>
                <el-tag v-if="item.product?.status === 'active'" size="small" type="success" effect="plain">
                  现货
                </el-tag>
                <el-tag v-else size="small" type="info" effect="plain">已下架</el-tag>
              </div>
            </div>
            <span class="col-price price">
              <span class="price-symbol">¥</span>{{ formatPrice(item.product?.price) }}
            </span>
            <div class="col-qty">
              <el-input-number
                :model-value="item.quantity"
                :min="1"
                :max="Math.max(item.product?.stock || 1, 1)"
                size="small"
                @change="(val) => changeQuantity(item, val)"
              />
            </div>
            <span class="col-subtotal price">
              <span class="price-symbol">¥</span>{{ formatPrice((item.product?.price || 0) * item.quantity) }}
            </span>
            <div class="col-action">
              <el-button text type="danger" @click="removeItem(item)">
                <el-icon><Delete /></el-icon> 删除
              </el-button>
            </div>
          </div>

          <!-- 结算栏 -->
          <div class="cart-footer">
            <el-button text @click="removeAll">清空购物车</el-button>
            <div class="footer-right">
              <span class="selected-count">已选 {{ selectedItems.length }} 件商品</span>
              <span class="total-label">合计：</span>
              <span class="total price"><span class="price-symbol">¥</span>{{ formatPrice(totalAmount) }}</span>
              <el-button type="primary" size="large" :disabled="!selectedItems.length" @click="checkout">
                去结算
              </el-button>
            </div>
          </div>
        </template>

        <el-empty v-else-if="!loading" description="购物车还是空的" class="empty-wrap">
          <el-button type="primary" @click="$router.push('/products')">去逛逛</el-button>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCartList, updateCartQuantity, deleteCartItem, clearCart } from '@/api/cart'
import { useCartStore } from '@/store/cart'
import { resolveImage, formatPrice } from '@/utils/format'

const router = useRouter()
const cartStore = useCartStore()

const items = ref([])
const selectedIds = ref([])
const loading = ref(false)

const selectedItems = computed(() => items.value.filter((i) => selectedIds.value.includes(i.id)))

const totalAmount = computed(() =>
  selectedItems.value.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0)
)

const allSelected = computed({
  get: () => items.value.length > 0 && selectedIds.value.length === items.value.length,
  set: () => {}
})

const indeterminate = computed(
  () => selectedIds.value.length > 0 && selectedIds.value.length < items.value.length
)

const loadCart = async () => {
  loading.value = true
  try {
    const res = await getCartList()
    items.value = res.data || []
    // 默认全选可用商品
    selectedIds.value = items.value.filter((i) => i.product?.status === 'active').map((i) => i.id)
    cartStore.items = items.value
  } catch (error) {
    items.value = []
  } finally {
    loading.value = false
  }
}

const toggleItem = (id, checked) => {
  if (checked) {
    if (!selectedIds.value.includes(id)) selectedIds.value.push(id)
  } else {
    selectedIds.value = selectedIds.value.filter((i) => i !== id)
  }
}

const toggleAll = (checked) => {
  selectedIds.value = checked ? items.value.map((i) => i.id) : []
}

const changeQuantity = async (item, val) => {
  try {
    await updateCartQuantity(item.id, val)
    item.quantity = val
    cartStore.items = items.value
  } catch (error) {
    loadCart()
  }
}

const removeItem = async (item) => {
  try {
    await ElMessageBox.confirm('确定要移除这件商品吗？', '提示', {
      confirmButtonText: '移除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await deleteCartItem(item.id)
    items.value = items.value.filter((i) => i.id !== item.id)
    selectedIds.value = selectedIds.value.filter((i) => i !== item.id)
    cartStore.loadCart()
    ElMessage.success('已移除')
  } catch (error) {
    /* 已提示 */
  }
}

const removeAll = async () => {
  try {
    await ElMessageBox.confirm('确定要清空购物车吗？', '提示', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await clearCart()
    items.value = []
    selectedIds.value = []
    cartStore.loadCart()
    ElMessage.success('购物车已清空')
  } catch (error) {
    /* 已提示 */
  }
}

const goProduct = (item) => {
  if (item.product) router.push(`/products/${item.product_id}`)
}

const checkout = () => {
  if (!selectedItems.value.length) return
  const invalid = selectedItems.value.find((i) => i.product?.status !== 'active')
  if (invalid) {
    ElMessage.warning('所选商品中包含已下架商品，请先移除')
    return
  }
  cartStore.setCheckoutItems(
    selectedItems.value.map((i) => ({
      product_id: i.product_id,
      quantity: i.quantity,
      cart_id: i.id,
      product: i.product
    }))
  )
  router.push({ name: 'Checkout', query: { mode: 'cart' } })
}

onMounted(loadCart)
</script>

<style scoped>
.cart-wrap {
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.cart-head,
.cart-row {
  display: grid;
  grid-template-columns: 60px 1fr 130px 150px 130px 100px;
  align-items: center;
  gap: 8px;
  padding: 0 24px;
}

.cart-head {
  height: 50px;
  background: #fafafa;
  color: var(--text-secondary);
  font-size: 13px;
  border-bottom: 1px solid var(--border-color);
}

.cart-head .col-goods {
  padding-left: 8px;
}

.cart-row {
  padding-top: 18px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border-color);
}

.goods {
  display: flex;
  gap: 14px;
  align-items: center;
  cursor: pointer;
  padding-left: 8px;
  min-width: 0;
}

.goods-img,
.img-fallback {
  width: 78px;
  height: 78px;
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

.goods-info {
  min-width: 0;
}

.goods-name {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 20px;
  margin-bottom: 6px;
  transition: color 0.2s;
}

.goods-name:hover {
  color: var(--brand);
}

.col-price,
.col-subtotal {
  text-align: center;
  font-size: 15px;
}

.col-subtotal {
  color: var(--price-color);
  font-weight: 700;
}

.col-qty {
  display: flex;
  justify-content: center;
}

.col-action {
  text-align: center;
}

.cart-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #fafafa;
  position: sticky;
  bottom: 0;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.selected-count {
  color: var(--text-secondary);
  font-size: 13px;
}

.total-label {
  color: var(--text-regular);
}

.total {
  font-size: 24px;
}

@media (max-width: 900px) {
  .cart-head {
    display: none;
  }
  .cart-row {
    grid-template-columns: 40px 1fr;
    gap: 12px;
    row-gap: 12px;
  }
  .col-price,
  .col-qty,
  .col-subtotal,
  .col-action {
    grid-column: 2;
    text-align: left;
    justify-content: flex-start;
  }
}
</style>
