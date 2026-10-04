<template>
  <div class="page">
    <div class="container">
      <!-- 搜索/分类结果头部 -->
      <div class="list-header">
        <span class="result-title">
          <template v-if="keyword">“{{ keyword }}” 的搜索结果</template>
          <template v-else-if="activeCategoryName">{{ activeCategoryName }}</template>
          <template v-else>全部商品</template>
        </span>
        <span class="result-count">共 {{ pagination.total }} 件商品</span>
      </div>

      <div class="list-body">
        <!-- 左侧筛选 -->
        <aside class="filter">
          <div class="filter-block">
            <h3>商品分类</h3>
            <ul class="cat-list">
              <li :class="{ active: !query.category_id }" @click="selectCategory('')">全部</li>
              <li
                v-for="cat in categories"
                :key="cat.id"
                :class="{ active: String(query.category_id) === String(cat.id) }"
                @click="selectCategory(cat.id)"
              >
                {{ cat.name }}
              </li>
            </ul>
          </div>

          <div class="filter-block">
            <h3>价格区间</h3>
            <div class="price-range">
              <el-input v-model="priceMin" placeholder="最低价" size="default" />
              <span class="dash">—</span>
              <el-input v-model="priceMax" placeholder="最高价" size="default" />
            </div>
            <el-button class="price-btn" type="primary" plain @click="applyPrice">确定</el-button>
            <el-button class="price-btn" text @click="resetPrice">重置</el-button>
          </div>
        </aside>

        <!-- 右侧列表 -->
        <section class="content">
          <div class="toolbar">
            <div class="sort-tabs">
              <span
                v-for="option in sortOptions"
                :key="option.value"
                class="sort-item"
                :class="{ active: sortKey === option.value }"
                @click="changeSort(option)"
              >
                {{ option.label }}
                <el-icon v-if="option.value === 'price' && sortKey === 'price'">
                  <Top v-if="query.order === 'asc'" />
                  <Bottom v-else />
                </el-icon>
              </span>
            </div>
          </div>

          <div v-loading="loading" class="product-grid">
            <ProductCard
              v-for="product in products"
              :key="product.id"
              :product="product"
              :favorited="isFavorited(product.id)"
              @add-cart="handleAddCart"
              @favorite="handleFavorite"
            />
          </div>

          <el-empty v-if="!loading && !products.length" description="没有找到相关商品" class="empty-wrap" />

          <div v-if="pagination.total > 0" class="pagination">
            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.limit"
              :page-sizes="[10, 20, 40]"
              :total="pagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @size-change="handleSizeChange"
              @current-change="loadProducts"
            />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import ProductCard from '@/components/ProductCard.vue'
import { getProducts } from '@/api/product'
import { getCategories } from '@/api/category'
import { addToCart } from '@/api/cart'
import { useUserStore } from '@/store/user'
import { useCartStore } from '@/store/cart'
import { useFavorites } from '@/composables/useFavorites'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()
const { isFavorited, loadFavorites, toggleFavorite } = useFavorites()

const categories = ref([])
const products = ref([])
const loading = ref(false)
const priceMin = ref('')
const priceMax = ref('')
const sortKey = ref('default')

const query = reactive({
  keyword: '',
  category_id: '',
  sortBy: 'created_at',
  order: 'desc'
})

const pagination = reactive({ page: 1, limit: 20, total: 0 })

const sortOptions = [
  { label: '综合', value: 'default', sortBy: 'created_at', order: 'desc' },
  { label: '销量', value: 'sales', sortBy: 'sales', order: 'desc' },
  { label: '价格', value: 'price', sortBy: 'price', order: 'asc' },
  { label: '新品', value: 'newest', sortBy: 'id', order: 'desc' }
]

const activeCategoryName = computed(() => {
  const cat = categories.value.find((c) => String(c.id) === String(query.category_id))
  return cat ? cat.name : ''
})

const keyword = computed(() => query.keyword)

// 将路由 query 同步到本地查询条件
const syncFromRoute = () => {
  query.keyword = route.query.keyword || ''
  query.category_id = route.query.category_id || ''
  if (route.query.sortBy === 'sales') {
    query.sortBy = 'sales'
    query.order = 'desc'
    sortKey.value = 'sales'
  } else {
    query.sortBy = 'created_at'
    query.order = 'desc'
    sortKey.value = 'default'
  }
  pagination.page = 1
}

const loadCategories = async () => {
  try {
    const res = await getCategories({ limit: 100, sortBy: 'sort', order: 'asc' })
    categories.value = (res.data.users || []).filter((c) => c.status === 'active')
  } catch (error) {
    categories.value = []
  }
}

const loadProducts = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      sortBy: query.sortBy,
      order: query.order
    }
    if (query.category_id) params.category_id = query.category_id
    if (query.keyword) params.keyword = query.keyword
    if (priceMin.value !== '') params.price_min = priceMin.value
    if (priceMax.value !== '') params.price_max = priceMax.value

    const res = await getProducts(params)
    products.value = res.data.products || []
    pagination.total = res.data.pagination?.total || 0
  } catch (error) {
    products.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const selectCategory = (id) => {
  router.replace({ name: 'ProductList', query: { ...route.query, category_id: id || undefined } })
}

const applyPrice = () => {
  pagination.page = 1
  loadProducts()
}

const resetPrice = () => {
  priceMin.value = ''
  priceMax.value = ''
  pagination.page = 1
  loadProducts()
}

const changeSort = (option) => {
  if (option.value === 'price' && sortKey.value === 'price') {
    query.order = query.order === 'asc' ? 'desc' : 'asc'
  } else {
    query.order = option.order
  }
  query.sortBy = option.sortBy
  sortKey.value = option.value
  pagination.page = 1
  loadProducts()
}

const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadProducts()
}

const handleAddCart = async (product) => {
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
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

watch(
  () => route.query,
  () => {
    syncFromRoute()
    loadProducts()
  }
)

onMounted(() => {
  syncFromRoute()
  loadCategories()
  loadProducts()
  loadFavorites()
})
</script>

<style scoped>
.list-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
}

.result-title {
  font-size: 20px;
  font-weight: 700;
}

.result-count {
  color: var(--text-secondary);
  font-size: 13px;
}

.list-body {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.filter {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  border-radius: var(--radius);
  padding: 18px;
  box-shadow: var(--shadow-card);
  position: sticky;
  top: 150px;
}

.filter-block + .filter-block {
  margin-top: 24px;
}

.filter-block h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.cat-list {
  list-style: none;
}

.cat-list li {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-regular);
  cursor: pointer;
  transition: all 0.2s;
}

.cat-list li:hover {
  color: var(--brand);
  background: var(--brand-light);
}

.cat-list li.active {
  color: #fff;
  background: var(--brand-gradient);
  font-weight: 600;
}

.price-range {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

.price-range .dash {
  color: #ccc;
}

.price-btn {
  flex: 1;
}

.content {
  flex: 1;
  min-width: 0;
}

.toolbar {
  background: #fff;
  border-radius: var(--radius);
  padding: 12px 18px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-card);
}

.sort-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-item {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-regular);
  cursor: pointer;
  transition: all 0.2s;
}

.sort-item:hover {
  color: var(--brand);
}

.sort-item.active {
  color: var(--brand);
  background: var(--brand-light);
  font-weight: 600;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  min-height: 200px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 28px;
}

@media (max-width: 900px) {
  .filter {
    display: none;
  }
}
</style>
