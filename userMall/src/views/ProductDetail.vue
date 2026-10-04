<template>
  <div class="page" v-loading="loading">
    <div class="container" v-if="product">
      <!-- 面包屑 -->
      <el-breadcrumb class="breadcrumb" separator="/">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ name: 'ProductList' }">全部商品</el-breadcrumb-item>
        <el-breadcrumb-item
          v-if="product.category"
          :to="{ name: 'ProductList', query: { category_id: product.category.id } }"
        >
          {{ product.category.name }}
        </el-breadcrumb-item>
        <el-breadcrumb-item>{{ product.name }}</el-breadcrumb-item>
      </el-breadcrumb>

      <div class="detail-main">
        <!-- 商品主图 -->
        <div class="gallery">
          <el-image :src="resolveImage(product.image)" fit="cover" class="main-image">
            <template #error>
              <div class="image-fallback"><el-icon size="60"><Picture /></el-icon></div>
            </template>
          </el-image>
        </div>

        <!-- 商品信息 -->
        <div class="info">
          <h1 class="name">{{ product.name }}</h1>
          <div class="sub-row">
            <el-tag v-if="product.category" type="info" effect="plain" size="small">
              {{ product.category.name }}
            </el-tag>
            <span class="sales">已售 {{ formatSales(product.sales) }} 件</span>
          </div>

          <div class="price-panel">
            <div class="price-line">
              <span class="label">价格</span>
              <span class="price now"><span class="price-symbol">¥</span>{{ formatPrice(product.price) }}</span>
            </div>
            <div class="price-line">
              <span class="label">库存</span>
              <span :class="['stock', product.stock > 0 ? '' : 'out']">
                {{ product.stock > 0 ? `有货（剩余 ${product.stock} 件）` : '已售罄' }}
              </span>
            </div>
          </div>

          <div class="merchant-row">
            <span class="label">商家</span>
            <span class="merchant">
              <el-icon><Shop /></el-icon>
              {{ product.merchant?.nickname || product.merchant?.username || '优选商城自营' }}
            </span>
          </div>

          <div class="qty-row">
            <span class="label">数量</span>
            <el-input-number
              v-model="quantity"
              :min="1"
              :max="Math.max(product.stock, 1)"
              :disabled="product.stock <= 0"
            />
          </div>

          <div class="actions">
            <el-button
              type="warning"
              size="large"
              plain
              :disabled="product.stock <= 0"
              @click="handleAddCart"
            >
              <el-icon><ShoppingCart /></el-icon>
              加入购物车
            </el-button>
            <el-button type="primary" size="large" :disabled="product.stock <= 0" @click="handleBuyNow">
              立即购买
            </el-button>
            <el-button
              size="large"
              :type="favorited ? 'danger' : 'default'"
              plain
              @click="handleFavorite"
            >
              <el-icon><StarFilled v-if="favorited" /><Star v-else /></el-icon>
              {{ favorited ? '已收藏' : '收藏' }}
            </el-button>
          </div>

          <div class="tips">
            <span><el-icon><CircleCheck /></el-icon> 正品保障</span>
            <span><el-icon><Van /></el-icon> 极速配送</span>
            <span><el-icon><RefreshLeft /></el-icon> 无忧退换</span>
          </div>
        </div>
      </div>

      <!-- 详情 / 评价 -->
      <div class="detail-tabs">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="商品详情" name="detail">
            <div class="description">
              <p v-if="product.description">{{ product.description }}</p>
              <el-empty v-else description="暂无商品详情" :image-size="90" />
            </div>
          </el-tab-pane>

          <el-tab-pane name="reviews">
            <template #label>
              用户评价
              <span v-if="reviewSummary.total" class="tab-badge">{{ reviewSummary.total }}</span>
            </template>
            <div class="reviews">
              <div class="review-summary" v-if="reviewSummary.total">
                <div class="avg">
                  <span class="score">{{ reviewSummary.avgRating }}</span>
                  <el-rate :model-value="reviewSummary.avgRating" disabled allow-half />
                  <span class="count">共 {{ reviewSummary.total }} 条评价</span>
                </div>
              </div>

              <ul class="review-list" v-loading="reviewLoading">
                <li v-for="review in reviews" :key="review.id" class="review-item">
                  <el-avatar :size="38" :src="resolveImage(review.user?.avatar)">
                    <el-icon><User /></el-icon>
                  </el-avatar>
                  <div class="review-body">
                    <div class="review-head">
                      <span class="nickname">
                        {{ review.user?.nickname || review.user?.username || '匿名用户' }}
                      </span>
                      <el-rate :model-value="review.rating" disabled size="small" />
                      <span class="date">{{ formatDateTime(review.created_at) }}</span>
                    </div>
                    <p class="content">{{ review.content || '此用户没有填写评价' }}</p>
                  </div>
                </li>
              </ul>

              <el-empty
                v-if="!reviewLoading && !reviews.length"
                description="还没有评价，快去购买后评价吧"
                :image-size="90"
              />

              <div v-if="reviewSummary.total > 0" class="review-pagination">
                <el-pagination
                  v-model:current-page="reviewPagination.page"
                  :page-size="reviewPagination.limit"
                  :total="reviewSummary.total"
                  layout="prev, pager, next"
                  background
                  @current-change="loadReviews"
                />
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 同类推荐 -->
      <section v-if="related.length">
        <div class="section-title"><h2>同类推荐</h2></div>
        <div class="related-grid">
          <ProductCard
            v-for="item in related"
            :key="item.id"
            :product="item"
            :favorited="isFavorited(item.id)"
            @add-cart="handleAddCart"
            @favorite="handleFavorite"
          />
        </div>
      </section>
    </div>

    <el-empty v-else-if="!loading" description="商品不存在或已下架" class="container empty-wrap" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import ProductCard from '@/components/ProductCard.vue'
import { getProductById, getProducts } from '@/api/product'
import { getProductReviews } from '@/api/review'
import { addToCart } from '@/api/cart'
import { checkFavorite } from '@/api/favorite'
import { useUserStore } from '@/store/user'
import { useCartStore } from '@/store/cart'
import { useFavorites } from '@/composables/useFavorites'
import { resolveImage, formatPrice, formatSales, formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()
const { isFavorited, toggleFavorite } = useFavorites()

const product = ref(null)
const related = ref([])
const quantity = ref(1)
const loading = ref(false)
const favorited = ref(false)
const activeTab = ref('detail')

const reviews = ref([])
const reviewLoading = ref(false)
const reviewPagination = ref({ page: 1, limit: 5 })
const reviewSummary = ref({ avgRating: 0, total: 0 })

const productId = () => route.params.id

const loadProduct = async () => {
  loading.value = true
  try {
    const res = await getProductById(productId())
    product.value = res.data
    await loadRelated()
  } catch (error) {
    product.value = null
  } finally {
    loading.value = false
  }
}

const loadRelated = async () => {
  if (!product.value?.category_id) return
  try {
    const res = await getProducts({
      page: 1,
      limit: 5,
      category_id: product.value.category_id,
      sortBy: 'sales',
      order: 'desc'
    })
    related.value = (res.data.products || []).filter((p) => p.id !== product.value.id).slice(0, 5)
  } catch (error) {
    related.value = []
  }
}

const loadReviews = async () => {
  reviewLoading.value = true
  try {
    const res = await getProductReviews(productId(), {
      page: reviewPagination.value.page,
      limit: reviewPagination.value.limit
    })
    reviews.value = res.data.reviews || []
    reviewSummary.value = { avgRating: res.data.avgRating || 0, total: res.data.total || 0 }
  } catch (error) {
    reviews.value = []
  } finally {
    reviewLoading.value = false
  }
}

const loadFavoriteStatus = async () => {
  if (!userStore.isAuthenticated) {
    favorited.value = false
    return
  }
  try {
    const res = await checkFavorite(productId())
    favorited.value = res.data.favorited
  } catch (error) {
    favorited.value = false
  }
}

const requireLogin = () => {
  if (userStore.isAuthenticated) return true
  ElMessage.warning('请先登录')
  router.push({ path: '/login', query: { redirect: route.fullPath } })
  return false
}

const handleAddCart = async (p) => {
  const target = p && p.id ? p : product.value
  if (!requireLogin()) return
  const qty = target.id === product.value?.id ? quantity.value : 1
  try {
    await addToCart({ product_id: target.id, quantity: qty })
    ElMessage.success('已加入购物车')
    cartStore.loadCart()
  } catch (error) {
    /* 已提示 */
  }
}

const handleBuyNow = () => {
  if (!requireLogin()) return
  router.push({
    name: 'Checkout',
    query: { product_id: product.value.id, quantity: quantity.value }
  })
}

const handleFavorite = async () => {
  if (!requireLogin()) return
  try {
    const result = await toggleFavorite(product.value)
    if (result !== null) favorited.value = result
  } catch (error) {
    /* 已提示 */
  }
}

onMounted(() => {
  loadProduct()
  loadReviews()
  loadFavoriteStatus()
})
</script>

<style scoped>
.breadcrumb {
  margin-bottom: 16px;
}

.detail-main {
  display: flex;
  gap: 32px;
  background: #fff;
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow-card);
}

.gallery {
  width: 420px;
  flex-shrink: 0;
}

.main-image,
.image-fallback {
  width: 420px;
  height: 420px;
  border-radius: var(--radius);
}

.image-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f7f7f7;
  color: #ccc;
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.name {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.4;
}

.sub-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}

.sub-row .sales {
  font-size: 13px;
  color: var(--text-secondary);
}

.price-panel {
  margin-top: 18px;
  padding: 18px 20px;
  border-radius: var(--radius);
  background: linear-gradient(90deg, #fff1ec 0%, #fff 100%);
}

.price-line {
  display: flex;
  align-items: center;
  gap: 16px;
}

.price-line + .price-line {
  margin-top: 10px;
}

.price-line .label {
  color: var(--text-secondary);
  font-size: 13px;
  width: 36px;
}

.price.now {
  font-size: 32px;
}

.stock {
  color: #00a870;
  font-size: 14px;
}

.stock.out {
  color: #ff2c55;
}

.merchant-row,
.qty-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 18px;
}

.merchant-row .label,
.qty-row .label {
  color: var(--text-secondary);
  font-size: 13px;
  width: 36px;
}

.merchant {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-regular);
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 28px;
}

.actions .el-button {
  min-width: 130px;
}

.tips {
  display: flex;
  gap: 20px;
  margin-top: 24px;
  color: var(--text-secondary);
  font-size: 13px;
}

.tips span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.detail-tabs {
  margin-top: 20px;
  background: #fff;
  border-radius: var(--radius);
  padding: 12px 24px 24px;
  box-shadow: var(--shadow-card);
}

.description {
  padding: 12px 0;
  color: var(--text-regular);
  line-height: 1.9;
  white-space: pre-wrap;
}

.tab-badge {
  margin-left: 4px;
  padding: 0 6px;
  border-radius: 8px;
  background: var(--brand-light);
  color: var(--brand);
  font-size: 12px;
}

.review-summary {
  padding: 8px 0 18px;
  border-bottom: 1px solid var(--border-color);
}

.avg {
  display: flex;
  align-items: center;
  gap: 14px;
}

.avg .score {
  font-size: 30px;
  font-weight: 700;
  color: var(--brand);
}

.avg .count {
  color: var(--text-secondary);
  font-size: 13px;
}

.review-list {
  list-style: none;
}

.review-item {
  display: flex;
  gap: 14px;
  padding: 18px 0;
  border-bottom: 1px dashed var(--border-color);
}

.review-body {
  flex: 1;
}

.review-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nickname {
  font-weight: 600;
  font-size: 14px;
}

.review-head .date {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-placeholder);
}

.review-body .content {
  margin-top: 8px;
  color: var(--text-regular);
  line-height: 1.7;
}

.review-pagination {
  display: flex;
  justify-content: center;
  margin-top: 22px;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

@media (max-width: 900px) {
  .detail-main {
    flex-direction: column;
  }
  .gallery,
  .main-image,
  .image-fallback {
    width: 100%;
  }
  .main-image,
  .image-fallback {
    height: 300px;
  }
}
</style>
