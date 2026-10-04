<template>
  <div class="order-actions">
    <!-- 待支付 -->
    <template v-if="order.status === 'pending'">
      <el-button size="small" @click="handleCancel">取消订单</el-button>
      <el-button size="small" type="primary" @click="handlePay">立即支付</el-button>
    </template>

    <!-- 待发货 -->
    <template v-else-if="order.status === 'paid'">
      <el-button size="small" type="primary" plain @click="openAfterSale">申请退款</el-button>
    </template>

    <!-- 待收货 -->
    <template v-else-if="order.status === 'shipped'">
      <el-button size="small" @click="openAfterSale">申请售后</el-button>
      <el-button size="small" type="primary" @click="handleConfirm">确认收货</el-button>
    </template>

    <!-- 已完成 -->
    <template v-else-if="order.status === 'completed'">
      <el-button v-if="reviewed" size="small" disabled>已评价</el-button>
      <el-button v-else size="small" type="primary" plain @click="openReview">评价晒单</el-button>
      <el-button size="small" @click="openAfterSale">申请售后</el-button>
      <el-button size="small" type="primary" @click="buyAgain">再次购买</el-button>
    </template>

    <!-- 已取消 -->
    <template v-else-if="order.status === 'cancelled'">
      <el-button size="small" type="primary" plain @click="buyAgain">再次购买</el-button>
    </template>

    <!-- 支付弹窗（模拟收银台） -->
    <el-dialog v-model="payVisible" title="模拟收银台" width="380px" align-center>
      <div class="pay-box">
        <p class="pay-amount"><span>应付金额</span><b>¥{{ formatPrice(order.total_price) }}</b></p>
        <el-radio-group v-model="payMethod" class="pay-methods">
          <el-radio label="wechat"><el-icon><ChatDotRound /></el-icon> 微信支付</el-radio>
          <el-radio label="alipay"><el-icon><Wallet /></el-icon> 支付宝</el-radio>
        </el-radio-group>
        <p class="pay-tips">毕业设计模拟支付，点击确认即视为支付成功</p>
      </div>
      <template #footer>
        <el-button @click="payVisible = false">取消</el-button>
        <el-button type="primary" :loading="paying" @click="doPay">确认支付</el-button>
      </template>
    </el-dialog>

    <!-- 评价弹窗 -->
    <el-dialog v-model="reviewVisible" title="评价商品" width="460px" align-center>
      <div class="review-goods" v-if="order.product">
        <el-image :src="resolveImage(order.product.image)" fit="cover" class="review-img">
          <template #error><div class="img-fallback"><el-icon><Picture /></el-icon></div></template>
        </el-image>
        <span class="ellipsis-2">{{ order.product.name }}</span>
      </div>
      <el-form label-width="60px">
        <el-form-item label="评分">
          <el-rate v-model="reviewForm.rating" show-text :texts="['很差', '较差', '一般', '满意', '非常满意']" />
        </el-form-item>
        <el-form-item label="评价">
          <el-input
            v-model="reviewForm.content"
            type="textarea"
            :rows="4"
            maxlength="300"
            show-word-limit
            placeholder="分享一下使用感受，帮助更多人做出选择～"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button type="primary" :loading="submittingReview" @click="submitReview">提交评价</el-button>
      </template>
    </el-dialog>

    <!-- 售后弹窗 -->
    <el-dialog v-model="afterSaleVisible" title="申请售后" width="460px" align-center>
      <el-form label-width="80px">
        <el-form-item label="售后类型">
          <el-radio-group v-model="afterSaleForm.type">
            <el-radio label="refund">仅退款</el-radio>
            <el-radio label="return" :disabled="order.status === 'paid'">退货退款</el-radio>
          </el-radio-group>
          <p v-if="order.status === 'paid'" class="form-tip">订单尚未发货，仅支持申请退款</p>
        </el-form-item>
        <el-form-item label="申请原因">
          <el-input
            v-model="afterSaleForm.reason"
            type="textarea"
            :rows="4"
            maxlength="200"
            show-word-limit
            placeholder="请描述申请售后的原因，例如：商品与描述不符、质量问题等"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="afterSaleVisible = false">取消</el-button>
        <el-button type="primary" :loading="submittingAfterSale" @click="submitAfterSale">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { payOrder, confirmOrder, cancelOrder } from '@/api/order'
import { createReview } from '@/api/review'
import { applyAfterSale } from '@/api/afterSale'
import { addToCart } from '@/api/cart'
import { useCartStore } from '@/store/cart'
import { resolveImage, formatPrice } from '@/utils/format'

const props = defineProps({
  order: { type: Object, required: true },
  reviewed: { type: Boolean, default: false }
})

const emit = defineEmits(['refresh'])

const router = useRouter()
const cartStore = useCartStore()

const payVisible = ref(false)
const payMethod = ref('wechat')
const paying = ref(false)

const reviewVisible = ref(false)
const submittingReview = ref(false)
const reviewForm = reactive({ rating: 5, content: '' })

const afterSaleVisible = ref(false)
const submittingAfterSale = ref(false)
const afterSaleForm = reactive({ type: 'refund', reason: '' })

const handlePay = () => {
  payMethod.value = 'wechat'
  payVisible.value = true
}

const doPay = async () => {
  paying.value = true
  try {
    await payOrder(props.order.id)
    ElMessage.success('支付成功')
    payVisible.value = false
    emit('refresh')
  } catch (error) {
    /* 已提示 */
  } finally {
    paying.value = false
  }
}

const handleConfirm = async () => {
  try {
    await ElMessageBox.confirm('确认已收到商品吗？确认后订单将完成。', '确认收货', {
      confirmButtonText: '确认收货',
      cancelButtonText: '取消',
      type: 'info'
    })
  } catch {
    return
  }
  try {
    await confirmOrder(props.order.id)
    ElMessage.success('已确认收货')
    emit('refresh')
  } catch (error) {
    /* 已提示 */
  }
}

const handleCancel = async () => {
  try {
    await ElMessageBox.confirm('确定要取消该订单吗？取消后库存将自动回补。', '取消订单', {
      confirmButtonText: '确定取消',
      cancelButtonText: '再想想',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await cancelOrder(props.order.id)
    ElMessage.success('订单已取消')
    emit('refresh')
  } catch (error) {
    /* 已提示 */
  }
}

const openReview = () => {
  reviewForm.rating = 5
  reviewForm.content = ''
  reviewVisible.value = true
}

const submitReview = async () => {
  if (!reviewForm.rating) {
    ElMessage.warning('请先选择评分')
    return
  }
  submittingReview.value = true
  try {
    await createReview({
      order_id: props.order.id,
      rating: reviewForm.rating,
      content: reviewForm.content
    })
    ElMessage.success('评价成功，感谢你的分享')
    reviewVisible.value = false
    emit('refresh')
  } catch (error) {
    /* 已提示 */
  } finally {
    submittingReview.value = false
  }
}

const openAfterSale = () => {
  afterSaleForm.type = props.order.status === 'paid' ? 'refund' : 'refund'
  afterSaleForm.reason = ''
  afterSaleVisible.value = true
}

const submitAfterSale = async () => {
  if (!afterSaleForm.reason.trim()) {
    ElMessage.warning('请填写申请原因')
    return
  }
  submittingAfterSale.value = true
  try {
    await applyAfterSale({
      order_id: props.order.id,
      type: afterSaleForm.type,
      reason: afterSaleForm.reason
    })
    ElMessage.success('售后申请已提交，请等待处理')
    afterSaleVisible.value = false
    emit('refresh')
  } catch (error) {
    /* 已提示 */
  } finally {
    submittingAfterSale.value = false
  }
}

const buyAgain = async () => {
  try {
    await addToCart({ product_id: props.order.product_id, quantity: props.order.quantity })
    cartStore.loadCart()
    ElMessage.success('已加入购物车')
    router.push('/cart')
  } catch (error) {
    /* 已提示 */
  }
}
</script>

<style scoped>
.order-actions {
  display: inline-flex;
  gap: 8px;
}

.pay-box {
  text-align: center;
}

.pay-amount {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
  color: var(--text-secondary);
}

.pay-amount b {
  font-size: 28px;
  color: var(--price-color);
}

.pay-methods {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.pay-methods :deep(.el-radio) {
  margin-right: 0;
}

.pay-tips {
  margin-top: 16px;
  font-size: 12px;
  color: var(--text-placeholder);
}

.review-goods {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px;
  background: #fafafa;
  border-radius: 10px;
  margin-bottom: 18px;
}

.review-img,
.img-fallback {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  flex-shrink: 0;
}

.img-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  color: #ccc;
}

.form-tip {
  font-size: 12px;
  color: var(--text-placeholder);
  margin-top: 4px;
}
</style>
