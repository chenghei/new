<template>
  <div class="page">
    <div class="container">
      <!-- 顶部：分类导航 + 轮播 -->
      <section class="hero">
        <aside class="cat-menu">
          <div class="cat-title"><el-icon><Menu /></el-icon> 全部分类</div>
          <ul class="cat-list">
            <li v-for="cat in categories" :key="cat.id" @click="goCategory(cat.id)">
              <span class="cat-name">{{ cat.name }}</span>
              <el-icon class="arrow"><ArrowRight /></el-icon>
            </li>
            <li v-if="categories.length === 0" class="cat-empty">暂无分类</li>
          </ul>
        </aside>

        <div class="hero-banner">
          <el-carousel height="360px" :interval="4500" arrow="hover">
            <el-carousel-item v-for="(banner, index) in banners" :key="index">
              <div class="banner-slide" :style="{ backgroundImage: `url(${banner.image})` }">
                <div class="banner-mask">
                  <h2>{{ banner.title }}</h2>
                  <p>{{ banner.subtitle }}</p>
                  <el-button type="primary" round size="large" @click="banner.action()">
                    {{ banner.button }}
                  </el-button>
                </div>
              </div>
            </el-carousel-item>
          </el-carousel>
        </div>
      </section>

      <!-- 服务保障条 -->
      <section class="promo-row">
        <div class="promo-card" v-for="item in promos" :key="item.title" @click="item.action()">
          <el-icon size="30" :style="{ color: item.color }"><component :is="item.icon" /></el-icon>
          <div>
            <p class="promo-title">{{ item.title }}</p>
            <p class="promo-desc">{{ item.desc }}</p>
          </div>
        </div>
      </section>

      <!-- 猜你喜欢（登录后展示） -->
      <section v-if="userStore.isAuthenticated">
        <div class="section-title">
          <h2>猜你喜欢</h2>
          <span class="more" @click="$router.push('/ai-assistant')">
            和 AI 助手聊聊 <el-icon><ArrowRight /></el-icon>
          </span>
        </div>
        <div v-loading="aiLoading" class="ai-wrap">
          <div v-if="recommendations.length" class="product-grid">
            <div v-for="item in recommendations" :key="item.product.id" class="ai-item">
              <ProductCard
                :product="item.product"
                :favorited="isFavorited(item.product.id)"
                @add-cart="handleAddCart"
                @favorite="handleFavorite"
              />
              <div class="ai-reason">
                <el-icon><MagicStick /></el-icon>
                <span class="ellipsis-2">{{ item.reason }}</span>
              </div>
            </div>
          </div>
          <el-empty v-else-if="!aiLoading" description="暂无推荐，去逛逛商品吧" class="empty-wrap" />
        </div>
      </section>

      <!-- 热销好物 -->
      <section>
        <div class="section-title">
          <h2>热销好物</h2>
          <span class="more" @click="$router.push({ name: 'ProductList', query: { sortBy: 'sales' } })">
            查看更多 <el-icon><ArrowRight /></el-icon>
          </span>
        </div>
        <div v-loading="hotLoading" class="product-grid">
          <ProductCard
            v-for="product in hotProducts"
            :key="product.id"
            :product="product"
            :favorited="isFavorited(product.id)"
            @add-cart="handleAddCart"
            @favorite="handleFavorite"
          />
        </div>
        <el-empty v-if="!hotLoading && !hotProducts.length" description="暂无商品" class="empty-wrap" />
      </section>

      <!-- 新品上架 -->
      <section>
        <div class="section-title">
          <h2>新品上架</h2>
          <span class="more" @click="$router.push('/products')">
            查看更多 <el-icon><ArrowRight /></el-icon>
          </span>
        </div>
        <div v-loading="newLoading" class="product-grid">
          <ProductCard
            v-for="product in newProducts"
            :key="product.id"
            :product="product"
            :favorited="isFavorited(product.id)"
            @add-cart="handleAddCart"
            @favorite="handleFavorite"
          />
        </div>
        <el-empty v-if="!newLoading && !newProducts.length" description="暂无商品" class="empty-wrap" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import ProductCard from '@/components/ProductCard.vue'
import { getCategories } from '@/api/category'
import { getProducts } from '@/api/product'
import { getRecommendations } from '@/api/ai'
import { addToCart } from '@/api/cart'
import { useUserStore } from '@/store/user'
import { useCartStore } from '@/store/cart'
import { useFavorites } from '@/composables/useFavorites'

const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()
const { isFavorited, loadFavorites, toggleFavorite } = useFavorites()

const categories = ref([])
const recommendations = ref([])
const hotProducts = ref([])
const newProducts = ref([])
const aiLoading = ref(false)
const hotLoading = ref(false)
const newLoading = ref(false)

// 轮播图使用后端本地图片（backend/uploads，经 /uploads 对外提供），无需依赖外部服务
const banners = [
  // {
  //   image: '/uploads/banner-1.jpg',
  //   title: '数码焕新季',
  //   subtitle: '潮流数码好物，限时优惠抢购中',
  //   button: '立即选购',
  //   action: () => router.push({ name: 'ProductList', query: { keyword: '数码' } })
  // },
  {
    image: '/uploads/banner-2.jpg',
    title: '品质生活精选',
    subtitle: '家居、美妆、食品，一站式购齐',
    button: '逛逛好物',
    action: () => router.push('/products')
  },
  {
    image: '/uploads/banner-3.jpg',
    title: 'AI 智能导购',
    subtitle: '说出你的需求，AI 助手为你精准推荐',
    button: '体验 AI 助手',
    action: () => router.push('/ai-assistant')
  }
]

const promos = [
  { icon: 'GoodsFilled', title: '正品保障', desc: '精选优质商品', color: '#ff4d21', action: () => router.push('/products') },
  { icon: 'Van', title: '极速配送', desc: '模拟物流快速送达', color: '#2f7bff', action: () => router.push('/orders') },
  { icon: 'RefreshLeft', title: '无忧退换', desc: '售后申请一键提交', color: '#00a870', action: () => router.push('/after-sales') },
  { icon: 'MagicStick', title: 'AI 导购', desc: '懂你所需的推荐', color: '#8a5cf6', action: () => router.push('/ai-assistant') }
]

const loadCategories = async () => {
  try {
    const res = await getCategories({ limit: 100, sortBy: 'sort', order: 'asc' })
    categories.value = (res.data.users || []).filter((c) => c.status === 'active')
  } catch (error) {
    categories.value = []
  }
}

const loadRecommendations = async () => {
  if (!userStore.isAuthenticated) return
  aiLoading.value = true
  try {
    const res = await getRecommendations()
    recommendations.value = res.data.recommendations || []
  } catch (error) {
    recommendations.value = []
  } finally {
    aiLoading.value = false
  }
}

const loadHot = async () => {
  hotLoading.value = true
  try {
    const res = await getProducts({ page: 1, limit: 10, sortBy: 'sales', order: 'desc' })
    hotProducts.value = res.data.products || []
  } catch (error) {
    hotProducts.value = []
  } finally {
    hotLoading.value = false
  }
}

const loadNew = async () => {
  newLoading.value = true
  try {
    const res = await getProducts({ page: 1, limit: 10, sortBy: 'created_at', order: 'desc' })
    newProducts.value = res.data.products || []
  } catch (error) {
    newProducts.value = []
  } finally {
    newLoading.value = false
  }
}

const goCategory = (id) => router.push({ name: 'ProductList', query: { category_id: id } })

const handleAddCart = async (product) => {
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录')
    router.push({ path: '/login', query: { redirect: '/' } })
    return
  }
  try {
    await addToCart({ product_id: product.id, quantity: 1 })
    ElMessage.success('已加入购物车')
    cartStore.loadCart()
  } catch (error) {
    /* 已提示 */
  }
}

const handleFavorite = async (product) => {
  try {
    await toggleFavorite(product)
  } catch (error) {
    /* 已提示 */
  }
}

onMounted(() => {
  loadCategories()
  loadHot()
  loadNew()
  loadFavorites()
  loadRecommendations()
})
</script>

<style scoped>
.hero {
  display: flex;
  gap: 16px;
  align-items: stretch;
}

.cat-menu {
  width: 210px;
  flex-shrink: 0;
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.cat-title {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 18px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--brand-gradient);
}

.cat-list {
  list-style: none;
  padding: 8px 0;
}

.cat-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 18px;
  font-size: 14px;
  color: var(--text-regular);
  cursor: pointer;
  transition: all 0.2s;
}

.cat-list li:hover {
  color: var(--brand);
  background: var(--brand-light);
}

.cat-list li:hover .arrow {
  transform: translateX(2px);
}

.cat-list .arrow {
  font-size: 12px;
  color: #ccc;
  transition: transform 0.2s;
}

.cat-empty {
  color: var(--text-placeholder) !important;
  cursor: default !important;
}

.hero-banner {
  flex: 1;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.banner-slide {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  position: relative;
}

.banner-mask {
  position: absolute;
  inset: 0;
  padding: 0 56px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  color: #fff;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.05) 65%);
}

.banner-mask h2 {
  font-size: 38px;
  font-weight: 800;
  letter-spacing: 2px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.banner-mask p {
  font-size: 16px;
  opacity: 0.92;
  margin-bottom: 8px;
}

.banner-mask .el-button {
  width: 140px;
  font-weight: 600;
}

.promo-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.promo-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border-radius: var(--radius);
  padding: 18px 20px;
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: all 0.2s;
}

.promo-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
}

.promo-title {
  font-size: 15px;
  font-weight: 600;
}

.promo-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 16px;
}

.ai-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-reason {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 12px;
  font-size: 12px;
  color: #8a5cf6;
  background: #f4f0ff;
  border-radius: 10px;
  line-height: 17px;
}

.ai-wrap {
  min-height: 80px;
}

@media (max-width: 992px) {
  .cat-menu {
    display: none;
  }
  .promo-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
