<template>
  <div class="page">
    <div class="container">
      <div class="section-title">
        <h2>我的收藏</h2>
        <span class="more" v-if="records.length">共 {{ records.length }} 件商品</span>
      </div>

      <div v-loading="loading">
        <div v-if="records.length" class="fav-grid">
          <ProductCard
            v-for="record in records"
            :key="record.id"
            :product="record.product"
            :favorited="true"
            @add-cart="handleAddCart"
            @favorite="handleRemove(record)"
          />
        </div>

        <el-empty v-else-if="!loading" description="还没有收藏任何商品" class="empty-wrap">
          <el-button type="primary" @click="$router.push('/products')">去发现好物</el-button>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ProductCard from '@/components/ProductCard.vue'
import { getFavorites, removeFavorite } from '@/api/favorite'
import { addToCart } from '@/api/cart'
import { useCartStore } from '@/store/cart'

const cartStore = useCartStore()

const records = ref([])
const loading = ref(false)

const loadFavorites = async () => {
  loading.value = true
  try {
    const res = await getFavorites()
    records.value = (res.data || []).filter((r) => r.product)
  } catch (error) {
    records.value = []
  } finally {
    loading.value = false
  }
}

const handleRemove = async (record) => {
  try {
    await removeFavorite(record.id)
    records.value = records.value.filter((r) => r.id !== record.id)
    ElMessage.success('已取消收藏')
  } catch (error) {
    /* 已提示 */
  }
}

const handleAddCart = async (product) => {
  try {
    await addToCart({ product_id: product.id, quantity: 1 })
    ElMessage.success('已加入购物车')
    cartStore.loadCart()
  } catch (error) {
    /* 已提示 */
  }
}

onMounted(loadFavorites)
</script>

<style scoped>
.fav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 16px;
}
</style>
