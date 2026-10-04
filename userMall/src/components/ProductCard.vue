<template>
  <div class="product-card hover-lift">
    <router-link :to="`/products/${product.id}`" class="card-link">
      <div class="image-wrap">
        <el-image :src="resolveImage(product.image)" fit="cover" class="image">
          <template #error>
            <div class="image-fallback">
              <el-icon size="34"><Picture /></el-icon>
            </div>
          </template>
        </el-image>
        <span v-if="product.stock <= 0" class="sold-out">已售罄</span>
      </div>
      <div class="info">
        <h3 class="name ellipsis-2">{{ product.name }}</h3>
        <div class="meta">
          <span class="category" v-if="product.category?.name">{{ product.category.name }}</span>
          <span class="sales">已售 {{ formatSales(product.sales) }}</span>
        </div>
        <div class="bottom">
          <span class="price">
            <span class="price-symbol">¥</span>{{ formatPrice(product.price) }}
          </span>
          <slot name="action" :product="product">
            <el-button type="primary" size="small" round @click.prevent.stop="$emit('add-cart', product)">
              <el-icon><ShoppingCart /></el-icon>
              加购
            </el-button>
          </slot>
        </div>
      </div>
    </router-link>

    <button
      class="fav-btn"
      :class="{ active: favorited }"
      title="收藏商品"
      @click.prevent.stop="$emit('favorite', product)"
    >
      <el-icon><StarFilled v-if="favorited" /><Star v-else /></el-icon>
    </button>
  </div>
</template>

<script setup>
import { resolveImage, formatPrice, formatSales } from '@/utils/format'

defineProps({
  product: { type: Object, required: true },
  favorited: { type: Boolean, default: false }
})

defineEmits(['add-cart', 'favorite'])
</script>

<style scoped>
.product-card {
  position: relative;
  background: #fff;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.card-link {
  display: block;
}

.image-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #f7f7f7;
}

.image,
.image-fallback {
  width: 100%;
  height: 100%;
}

.image-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c8c8c8;
  background: #f7f7f7;
}

.sold-out {
  position: absolute;
  left: 0;
  top: 0;
  padding: 3px 12px;
  font-size: 12px;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 0 0 12px 0;
}

.info {
  padding: 12px 14px 16px;
}

.name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 20px;
  height: 40px;
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 6px 0 10px;
  font-size: 12px;
  color: var(--text-secondary);
}

.category {
  padding: 1px 8px;
  border-radius: 10px;
  color: var(--brand);
  background: var(--brand-light);
}

.bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.price {
  font-size: 19px;
}

.fav-btn {
  position: absolute;
  right: 12px;
  top: 12px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: #bbb;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(-4px);
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.product-card:hover .fav-btn {
  opacity: 1;
  transform: translateY(0);
}

.fav-btn.active {
  color: #ffb400;
  opacity: 1;
  transform: translateY(0);
}
</style>
