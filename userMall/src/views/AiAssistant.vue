<template>
  <div class="page">
    <div class="container ai-page">
      <!-- 对话区 -->
      <section class="chat-panel">
        <div class="chat-head">
          <div class="assistant-info">
            <div class="avatar"><el-icon size="22"><MagicStick /></el-icon></div>
            <div>
              <p class="assistant-name">小购 · AI 购物助手</p>
              <p class="assistant-desc">结合你的浏览、收藏与购买记录为你推荐</p>
            </div>
          </div>
          <div class="head-actions">
            <el-button text @click="openShopFinder">
              <el-icon><Shop /></el-icon> 找商家商品
            </el-button>
            <el-button text @click="resetChat"><el-icon><RefreshRight /></el-icon> 新对话</el-button>
          </div>
        </div>

        <div ref="scrollRef" class="chat-body" v-loading="initialLoading">
          <div v-for="(msg, index) in messages" :key="index" :class="['msg-row', msg.role]">
            <div v-if="msg.role === 'assistant'" class="avatar small">
              <el-icon><MagicStick /></el-icon>
            </div>
            <div class="bubble" :class="msg.role">
              <template v-if="msg.role === 'assistant'">
                <div v-for="(line, i) in parseLines(msg.content)" :key="i">
                  <div v-if="line.type === 'product'" class="rec-card" @click="searchProduct(line.name)">
                    <div class="rec-info">
                      <p class="rec-name ellipsis">{{ line.name }}</p>
                      <p class="rec-reason ellipsis-2">{{ line.reason }}</p>
                    </div>
                    <div class="rec-right">
                      <span class="price"><span class="price-symbol">¥</span>{{ line.price }}</span>
                      <el-icon><ArrowRight /></el-icon>
                    </div>
                  </div>
                  <p v-else-if="line.text" class="text">{{ line.text }}</p>
                </div>
              </template>
              <p v-else class="text">{{ msg.content }}</p>
            </div>
            <el-avatar v-if="msg.role === 'user'" :size="34" class="user-avatar">
              {{ userStore.displayName.charAt(0) }}
            </el-avatar>
          </div>

          <div v-if="typing" class="msg-row assistant">
            <div class="avatar small"><el-icon><MagicStick /></el-icon></div>
            <div class="bubble assistant typing"><span></span><span></span><span></span></div>
          </div>
        </div>

        <div class="chat-foot">
          <div class="quick-asks">
            <span v-for="q in quickAsks" :key="q" class="quick-chip" @click="sendMessage(q)">{{ q }}</span>
          </div>
          <div class="input-row">
            <el-input
              v-model="input"
              type="textarea"
              :rows="2"
              resize="none"
              maxlength="200"
              show-word-limit
              placeholder="说说你的购物需求，例如：想买一款适合学生党的蓝牙耳机"
              @keydown.enter.exact.prevent="sendMessage()"
            />
            <el-button type="primary" size="large" :loading="typing" @click="sendMessage()">发送</el-button>
          </div>
        </div>
      </section>

      <!-- AI 精选项 -->
      <aside class="rec-panel">
        <div class="rec-head">
          <el-icon><Star /></el-icon>
          <span>AI 精选推荐</span>
        </div>
        <div v-loading="recLoading" class="rec-list">
          <div v-for="item in recommendations" :key="item.product.id" class="rec-product" @click="goProduct(item.product.id)">
            <el-image :src="resolveImage(item.product.image)" fit="cover" class="rec-img">
              <template #error>
                <div class="rec-img-fallback"><el-icon><Picture /></el-icon></div>
              </template>
            </el-image>
            <div class="rec-product-info">
              <p class="rec-product-name ellipsis-2">{{ item.product.name }}</p>
              <span class="price"><span class="price-symbol">¥</span>{{ formatPrice(item.product.price) }}</span>
              <p class="rec-product-reason ellipsis-2">{{ item.reason }}</p>
            </div>
          </div>
          <el-empty v-if="!recLoading && !recommendations.length" description="暂无推荐" :image-size="70" />
        </div>
      </aside>
    </div>

    <!-- 找商家商品：选择商家后查看该商家的在售商品 -->
    <el-dialog v-model="shopDialogVisible" title="找商家商品" width="min(900px, 94vw)" top="6vh" class="shop-finder">
      <div class="finder-body">
        <!-- 左侧：商家列表 -->
        <aside class="shop-side">
          <el-input
            v-model="shopKeyword"
            placeholder="搜索商家名称"
            clearable
            @keyup.enter="loadShops"
            @clear="loadShops"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
            <template #append>
              <el-button @click="loadShops">搜索</el-button>
            </template>
          </el-input>

          <div v-loading="shopLoading" class="shop-list">
            <button
              v-for="s in shops"
              :key="s.id"
              type="button"
              :class="['shop-item', { active: currentShop && currentShop.id === s.id }]"
              @click="selectShop(s)"
            >
              <el-avatar :size="40" shape="square" :src="resolveImage(s.logo)">
                <el-icon><Shop /></el-icon>
              </el-avatar>
              <div class="shop-item-info">
                <p class="shop-item-name ellipsis">{{ s.shop_name }}</p>
                <p class="shop-item-sub ellipsis">
                  {{ s.business_category || '综合' }} · {{ s.product_count }} 件在售
                </p>
              </div>
              <el-icon v-if="currentShop && currentShop.id === s.id" class="shop-item-arrow"><ArrowRight /></el-icon>
            </button>
            <el-empty v-if="!shopLoading && !shops.length" description="没有找到商家" :image-size="60" />
          </div>
        </aside>

        <!-- 右侧：商家商品 -->
        <section class="shop-products">
          <div class="shop-products-head">
            <span v-if="currentShop">
              「{{ currentShop.shop_name }}」在售商品
              <b>{{ shopProductTotal }}</b> 件
            </span>
            <span v-else class="muted">请选择左侧商家</span>
          </div>

          <div v-loading="productLoading" class="shop-products-body">
            <div v-if="currentShop && shopProducts.length" class="shop-product-grid">
              <ProductCard
                v-for="p in shopProducts"
                :key="p.id"
                :product="p"
                :favorited="isFavorited(p.id)"
                @add-cart="handleAddCart"
                @favorite="handleFavorite"
              />
            </div>
            <el-empty
              v-else-if="currentShop && !productLoading"
              description="该商家暂无在售商品"
              :image-size="70"
            />
            <el-empty v-else-if="!currentShop" description="选择商家后查看其商品" :image-size="70" />

            <div v-if="shopProductTotal > shopProductQuery.limit" class="shop-pager">
              <el-pagination
                layout="prev, pager, next"
                small
                background
                :current-page="shopProductQuery.page"
                :page-size="shopProductQuery.limit"
                :total="shopProductTotal"
                @current-change="handleShopPageChange"
              />
            </div>
          </div>
        </section>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import ProductCard from '@/components/ProductCard.vue'
import { aiChat, getRecommendations } from '@/api/ai'
import { getProducts } from '@/api/product'
import { getShops } from '@/api/shop'
import { addToCart } from '@/api/cart'
import { useUserStore } from '@/store/user'
import { useCartStore } from '@/store/cart'
import { useFavorites } from '@/composables/useFavorites'
import { resolveImage, formatPrice } from '@/utils/format'

const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()
const { isFavorited, loadFavorites, toggleFavorite } = useFavorites()

// 找商家商品
const shopDialogVisible = ref(false)
const shopLoading = ref(false)
const productLoading = ref(false)
const shops = ref([])
const shopKeyword = ref('')
const currentShop = ref(null)
const shopProducts = ref([])
const shopProductTotal = ref(0)
const shopProductQuery = reactive({ page: 1, limit: 8 })

const scrollRef = ref()
const input = ref('')
const typing = ref(false)
const initialLoading = ref(false)
const recLoading = ref(false)
const recommendations = ref([])

const messages = ref([])

const quickAsks = [
  '推荐一款高性价比的蓝牙耳机',
  '有什么适合送人的礼物？',
  '帮我挑一款家居好物',
  '最近有什么值得买的新品？'
]

const welcome = {
  role: 'assistant',
  content:
    '你好呀，我是你的专属导购「小购」👋\n告诉我你想买什么，或者直接说说你的预算和用途，我来帮你挑选最合适的商品～'
}

// 解析 AI 回复中的「商品名｜¥价格｜推荐理由」为商品卡片行
const parseLines = (content) => {
  if (!content) return []
  return content.split('\n').map((raw) => {
    const line = raw.trim()
    if (!line) return { type: 'text', text: '' }
    const match = line.match(/^(.+?)\s*[｜|]\s*¥?\s*([\d.]+)\s*[｜|]\s*(.+)$/)
    if (match) {
      return { type: 'product', name: match[1].trim(), price: match[2], reason: match[3].trim() }
    }
    return { type: 'text', text: line }
  })
}

const scrollToBottom = async () => {
  await nextTick()
  if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight
}

const resetChat = () => {
  messages.value = [{ ...welcome }]
  scrollToBottom()
}

const sendMessage = async (preset) => {
  const content = (preset ?? input.value).trim()
  if (!content || typing.value) return

  messages.value.push({ role: 'user', content })
  input.value = ''
  typing.value = true
  scrollToBottom()

  try {
    const history = messages.value.map((m) => ({ role: m.role, content: m.content }))
    const res = await aiChat(history)
    messages.value.push({ role: 'assistant', content: res.data.reply })
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      content: '抱歉，我暂时有点忙不过来了 😅 请稍后再试，或者直接去商品列表逛逛吧～'
    })
  } finally {
    typing.value = false
    scrollToBottom()
  }
}

const searchProduct = (name) => {
  router.push({ name: 'ProductList', query: { keyword: name } })
}

const goProduct = (id) => router.push(`/products/${id}`)

const loadRecommendations = async () => {
  recLoading.value = true
  try {
    const res = await getRecommendations()
    recommendations.value = res.data.recommendations || []
  } catch (error) {
    recommendations.value = []
  } finally {
    recLoading.value = false
  }
}

/* ---------------- 找商家商品 ---------------- */

const loadShops = async () => {
  shopLoading.value = true
  try {
    const res = await getShops(shopKeyword.value ? { keyword: shopKeyword.value } : {})
    shops.value = res.data.shops || []
    // 当前选中的商家被搜索条件过滤掉时，清空右侧商品
    if (currentShop.value && !shops.value.some((s) => s.id === currentShop.value.id)) {
      currentShop.value = null
      shopProducts.value = []
      shopProductTotal.value = 0
    }
  } catch (error) {
    shops.value = []
  } finally {
    shopLoading.value = false
  }
}

const loadShopProducts = async () => {
  if (!currentShop.value) return
  productLoading.value = true
  try {
    const res = await getProducts({
      merchant_id: currentShop.value.user_id,
      page: shopProductQuery.page,
      limit: shopProductQuery.limit,
      sortBy: 'sales',
      order: 'desc'
    })
    shopProducts.value = res.data.products || []
    shopProductTotal.value = res.data.pagination?.total || 0
  } catch (error) {
    shopProducts.value = []
    shopProductTotal.value = 0
  } finally {
    productLoading.value = false
  }
}

const selectShop = (shop) => {
  currentShop.value = shop
  shopProductQuery.page = 1
  loadShopProducts()
}

const handleShopPageChange = (page) => {
  shopProductQuery.page = page
  loadShopProducts()
}

const openShopFinder = async () => {
  shopDialogVisible.value = true
  if (!shops.value.length) await loadShops()
}

const handleAddCart = async (product) => {
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录')
    router.push({ path: '/login', query: { redirect: '/ai-assistant' } })
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
  resetChat()
  loadRecommendations()
  loadFavorites()
})
</script>

<style scoped>
.ai-page {
  display: flex;
  gap: 20px;
  align-items: stretch;
}

.chat-panel {
  flex: 1;
  min-width: 0;
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 220px);
  min-height: 520px;
}

.chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.assistant-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--brand-gradient);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar.small {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  flex-shrink: 0;
}

.assistant-name {
  font-size: 15px;
  font-weight: 700;
}

.assistant-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #fafafa;
}

.msg-row {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
}

.msg-row.user {
  justify-content: flex-end;
}

.bubble {
  max-width: 78%;
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.bubble.assistant {
  background: #fff;
  border: 1px solid var(--border-color);
  border-top-left-radius: 4px;
}

.bubble.user {
  background: var(--brand-gradient);
  color: #fff;
  border-top-right-radius: 4px;
}

.bubble .text {
  margin: 2px 0;
}

.user-avatar {
  background: #ffe4da;
  color: var(--brand);
  font-weight: 700;
  flex-shrink: 0;
}

/* 推荐商品卡片 */
.rec-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: linear-gradient(90deg, #fff6f2, #fff);
  border: 1px solid #ffe4da;
  cursor: pointer;
  transition: all 0.2s;
}

.rec-card:hover {
  border-color: var(--brand);
  transform: translateX(2px);
}

.rec-info {
  flex: 1;
  min-width: 0;
}

.rec-name {
  font-size: 14px;
  font-weight: 600;
}

.rec-reason {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.rec-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rec-right .price {
  font-size: 16px;
}

/* 输入区 */
.chat-foot {
  border-top: 1px solid var(--border-color);
  padding: 12px 20px 18px;
}

.quick-asks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.quick-chip {
  padding: 5px 12px;
  font-size: 12px;
  color: var(--text-regular);
  background: #f5f5f5;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-chip:hover {
  color: var(--brand);
  background: var(--brand-light);
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.input-row .el-button {
  height: 54px;
  min-width: 88px;
}

/* typing 动画 */
.typing span {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 4px;
  border-radius: 50%;
  background: #ccc;
  animation: blink 1.2s infinite ease-in-out;
}

.typing span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0.2;
  }
  40% {
    opacity: 1;
  }
}

/* 右侧推荐 */
.rec-panel {
  width: 320px;
  flex-shrink: 0;
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 220px);
  min-height: 520px;
}

.rec-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 18px;
  font-weight: 700;
  color: var(--brand);
  border-bottom: 1px solid var(--border-color);
}

.rec-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.rec-product {
  display: flex;
  gap: 12px;
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.rec-product:hover {
  background: #fafafa;
}

.rec-img,
.rec-img-fallback {
  width: 76px;
  height: 76px;
  border-radius: 10px;
  flex-shrink: 0;
}

.rec-img-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #ccc;
}

.rec-product-info {
  flex: 1;
  min-width: 0;
}

.rec-product-name {
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  height: 36px;
}

.rec-product-reason {
  font-size: 11px;
  color: #8a5cf6;
  margin-top: 4px;
}

.rec-product-info .price {
  font-size: 15px;
}

/* ---------------- 找商家商品 ---------------- */
.head-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.finder-body {
  display: flex;
  gap: 16px;
  height: 460px;
}

.shop-side {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.shop-list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 6px;
}

.shop-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;
}

.shop-item:hover {
  background: #fafafa;
}

.shop-item.active {
  background: var(--brand-light);
}

.shop-item-info {
  flex: 1;
  min-width: 0;
}

.shop-item-name {
  font-size: 13px;
  font-weight: 600;
}

.shop-item-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-secondary);
}

.shop-item-arrow {
  color: var(--brand);
}

.shop-products {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.shop-products-head {
  padding-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid var(--border-color);
}

.shop-products-head b {
  color: var(--brand);
}

.shop-products-head .muted {
  font-weight: 400;
  color: var(--text-secondary);
}

.shop-products-body {
  flex: 1;
  overflow-y: auto;
  padding-top: 12px;
}

.shop-product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.shop-pager {
  display: flex;
  justify-content: center;
  margin-top: 14px;
}

@media (max-width: 992px) {
  .rec-panel {
    display: none;
  }

  .finder-body {
    flex-direction: column;
    height: auto;
  }

  .shop-side {
    width: 100%;
  }

  .shop-list {
    max-height: 200px;
  }

  .shop-product-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
