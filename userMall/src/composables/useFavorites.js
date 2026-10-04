import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getFavorites, toggleFavorite as toggleFavoriteApi } from '@/api/favorite'
import { useUserStore } from '@/store/user'

/**
 * 收藏能力复用：在首页 / 商品列表 / 收藏页中统一管理"当前用户已收藏的商品集合"，
 * 避免每个页面各写一遍加载与切换逻辑。
 */
export function useFavorites() {
  const userStore = useUserStore()
  const favoriteIds = ref(new Set())
  const favoriteRecords = ref([])

  // 加载收藏记录（未登录时清空）
  const loadFavorites = async () => {
    if (!userStore.isAuthenticated) {
      favoriteIds.value = new Set()
      favoriteRecords.value = []
      return
    }
    try {
      const res = await getFavorites()
      favoriteRecords.value = res.data || []
      favoriteIds.value = new Set(favoriteRecords.value.map((f) => f.product_id))
    } catch (error) {
      favoriteIds.value = new Set()
    }
  }

  const isFavorited = (productId) => favoriteIds.value.has(productId)

  // 切换收藏状态（开关式）
  const toggleFavorite = async (product) => {
    if (!userStore.isAuthenticated) {
      ElMessage.warning('请先登录后再收藏')
      return null
    }
    const res = await toggleFavoriteApi(product.id)
    const favorited = res.data.favorited
    const next = new Set(favoriteIds.value)
    if (favorited) next.add(product.id)
    else next.delete(product.id)
    favoriteIds.value = next
    ElMessage.success(favorited ? '已加入收藏' : '已取消收藏')
    return favorited
  }

  return { favoriteIds, favoriteRecords, loadFavorites, isFavorited, toggleFavorite }
}
