<template>
  <div class="reviews-page">
    <!-- 评价概览 -->
    <el-row :gutter="16">
      <el-col :xs="24" :md="8">
        <el-card class="overview-card">
          <div class="score-wrap">
            <div class="score">{{ avgRating || '0.0' }}</div>
            <el-rate :model-value="Number(avgRating)" disabled allow-half />
            <p class="score-label">共 {{ total }} 条评价</p>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="16">
        <el-card class="chart-card">
          <div class="card-title">评价星级分布</div>
          <EChart :option="ratingOption" height="200px" />
        </el-card>
      </el-col>
    </el-row>

    <el-card class="table-card">
      <div class="toolbar">
        <div class="filters">
          <el-select
            v-model="filters.product_id"
            placeholder="按商品筛选"
            clearable
            filterable
            style="width: 220px"
            @change="handleSearch"
          >
            <el-option v-for="p in products" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
          <el-select v-model="filters.rating" placeholder="按评分筛选" clearable style="width: 140px" @change="handleSearch">
            <el-option v-for="r in [5, 4, 3, 2, 1]" :key="r" :label="`${r} 星`" :value="r" />
          </el-select>
          <el-button @click="resetFilters">重置</el-button>
        </div>
        <el-button type="primary" :loading="analyzing" @click="handleAnalyze">
          <el-icon><MagicStick /></el-icon> AI 评价分析
        </el-button>
      </div>

      <el-table :data="reviews" v-loading="loading" stripe>
        <el-table-column label="商品" min-width="200">
          <template #default="{ row }">
            <div class="table-goods">
              <el-image :src="resolveImage(row.product?.image)" fit="cover" class="table-goods-img">
                <template #error>
                  <div class="table-goods-img-fallback"><el-icon><Picture /></el-icon></div>
                </template>
              </el-image>
              <span class="ellipsis-2 goods-name">{{ row.product?.name || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="用户" width="140">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="26" :src="resolveImage(row.user?.avatar)">
                <el-icon><User /></el-icon>
              </el-avatar>
              <span class="ellipsis">{{ row.user?.nickname || row.user?.username || '匿名用户' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="评分" width="150">
          <template #default="{ row }">
            <el-rate :model-value="row.rating" disabled size="small" />
          </template>
        </el-table-column>
        <el-table-column label="评价内容" min-width="260">
          <template #default="{ row }">
            <span class="content">{{ row.content || '此用户没有填写评价' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="评价时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无评价" :image-size="90" />
        </template>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          :page-size="pagination.limit"
          :total="pagination.total"
          layout="total, prev, pager, next"
          background
          @current-change="loadReviews"
        />
      </div>
    </el-card>

    <!-- AI 分析结果 -->
    <el-dialog v-model="analysisVisible" title="AI 评价分析报告" width="720px" top="6vh">
      <div v-if="analysis" v-loading="analyzing" class="analysis">
        <el-alert
          :title="analysis.source === 'ai' ? '由 AI 大模型分析生成' : 'AI 不可用，已降级为规则化摘要'"
          :type="analysis.source === 'ai' ? 'success' : 'warning'"
          :closable="false"
          show-icon
          class="analysis-alert"
        />

        <div class="analysis-summary">
          <p>{{ analysis.summary }}</p>
          <div class="sentiment">
            <span class="pill positive">好评 {{ analysis.sentiment.positive }}</span>
            <span class="pill neutral">中评 {{ analysis.sentiment.neutral }}</span>
            <span class="pill negative">差评 {{ analysis.sentiment.negative }}</span>
          </div>
        </div>

        <el-row :gutter="16">
          <el-col :xs="24" :md="10">
            <EChart :option="sentimentOption" height="220px" />
          </el-col>
          <el-col :xs="24" :md="14">
            <div class="analysis-grid">
              <div class="analysis-block">
                <div class="block-title positive"><el-icon><CircleCheck /></el-icon> 正面评价</div>
                <ul><li v-for="(t, i) in analysis.positives" :key="i">{{ t }}</li></ul>
              </div>
              <div class="analysis-block">
                <div class="block-title negative"><el-icon><CircleClose /></el-icon> 负面评价</div>
                <ul><li v-for="(t, i) in analysis.negatives" :key="i">{{ t }}</li></ul>
              </div>
            </div>
          </el-col>
        </el-row>

        <div class="analysis-block full">
          <div class="block-title"><el-icon><View /></el-icon> 用户关注点</div>
          <div class="tags">
            <el-tag v-for="(t, i) in analysis.concerns" :key="i" effect="plain" round>{{ t }}</el-tag>
          </div>
        </div>

        <div class="analysis-block full">
          <div class="block-title"><el-icon><QuestionFilled /></el-icon> 常见问题</div>
          <ul><li v-for="(t, i) in analysis.faqs" :key="i">{{ t }}</li></ul>
        </div>

        <div class="analysis-block full">
          <div class="block-title"><el-icon><Opportunity /></el-icon> 优化建议</div>
          <ul><li v-for="(t, i) in analysis.suggestions" :key="i">{{ t }}</li></ul>
        </div>
      </div>
      <el-empty v-else v-loading="analyzing" description="正在分析，请稍候..." :image-size="90" />
      <template #footer>
        <el-button @click="analysisVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import EChart from '@/components/EChart.vue'
import { getMerchantReviews, analyzeReviews } from '@/api/review'
import { getReviewRatingDistribution } from '@/api/stats'
import { getProducts } from '@/api/product'
import { resolveImage, formatDateTime } from '@/utils/format'

const reviews = ref([])
const products = ref([])
const ratingDist = ref([])
const loading = ref(false)
const analyzing = ref(false)

const total = ref(0)
const avgRating = ref(0)

const filters = reactive({ product_id: null, rating: null })
const pagination = reactive({ page: 1, limit: 10, total: 0 })

const analysisVisible = ref(false)
const analysis = ref(null)

const ratingOption = computed(() => ({
  grid: { top: 20, left: 40, right: 20, bottom: 24 },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  xAxis: {
    type: 'category',
    data: ratingDist.value.map((r) => `${r.rating}星`),
    axisLine: { lineStyle: { color: '#e5e6eb' } },
    axisLabel: { color: '#86909c' }
  },
  yAxis: {
    type: 'value',
    minInterval: 1,
    splitLine: { lineStyle: { color: '#f2f3f5' } },
    axisLabel: { color: '#86909c' }
  },
  series: [
    {
      type: 'bar',
      data: ratingDist.value.map((r) => r.count),
      barWidth: 28,
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#ff8f4d' },
            { offset: 1, color: '#ff4d21' }
          ]
        }
      }
    }
  ]
}))

const sentimentOption = computed(() => {
  const s = analysis.value?.sentiment || { positive: 0, neutral: 0, negative: 0 }
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, textStyle: { color: '#86909c' } },
    series: [
      {
        type: 'pie',
        radius: ['42%', '66%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: false,
        label: { show: true, formatter: '{b}\n{d}%', color: '#4e5969' },
        data: [
          { name: '好评', value: s.positive, itemStyle: { color: '#00a870' } },
          { name: '中评', value: s.neutral, itemStyle: { color: '#ff8f1f' } },
          { name: '差评', value: s.negative, itemStyle: { color: '#ff2c55' } }
        ]
      }
    ]
  }
})

const loadReviews = async () => {
  loading.value = true
  try {
    const params = { page: pagination.page, limit: pagination.limit }
    if (filters.product_id) params.product_id = filters.product_id
    if (filters.rating) params.rating = filters.rating

    const res = await getMerchantReviews(params)
    reviews.value = res.data.reviews || []
    total.value = res.data.total || 0
    avgRating.value = res.data.avgRating || 0
    pagination.total = res.data.pagination?.total || 0
  } catch (error) {
    reviews.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const loadRatingDist = async () => {
  try {
    const res = await getReviewRatingDistribution()
    ratingDist.value = res.data || []
  } catch (error) {
    ratingDist.value = []
  }
}

const loadProducts = async () => {
  try {
    const res = await getProducts({ scope: 'mine', page: 1, limit: 100 })
    products.value = res.data.products || []
  } catch (error) {
    products.value = []
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadReviews()
}

const resetFilters = () => {
  filters.product_id = null
  filters.rating = null
  pagination.page = 1
  loadReviews()
}

const handleAnalyze = async () => {
  analyzing.value = true
  analysis.value = null
  analysisVisible.value = true
  try {
    const res = await analyzeReviews(filters.product_id || undefined)
    analysis.value = res.data
  } catch (error) {
    // 无评价可分析时关闭弹窗
    analysisVisible.value = false
  } finally {
    analyzing.value = false
  }
}

onMounted(() => {
  loadReviews()
  loadRatingDist()
  loadProducts()
})
</script>

<style scoped>
.overview-card,
.chart-card,
.table-card {
  border-radius: var(--radius);
  border: none;
  box-shadow: var(--shadow-card);
}

.overview-card,
.chart-card {
  margin-bottom: 14px;
  min-height: 260px;
}

.score-wrap {
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.score {
  font-size: 52px;
  font-weight: 800;
  line-height: 1;
  background: var(--brand-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.score-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 8px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.goods-name {
  font-size: 13px;
  line-height: 19px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.content {
  color: var(--text-regular);
  font-size: 13px;
  line-height: 1.7;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* AI 分析报告 */
.analysis-alert {
  margin-bottom: 16px;
}

.analysis-summary {
  padding: 14px 16px;
  border-radius: 10px;
  background: #f7f8fa;
  margin-bottom: 16px;
}

.analysis-summary p {
  line-height: 1.8;
  color: var(--text-regular);
}

.sentiment {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.pill {
  padding: 3px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.pill.positive {
  color: #00a870;
  background: #e8f8f2;
}

.pill.neutral {
  color: #ff8f1f;
  background: #fff7e6;
}

.pill.negative {
  color: #ff2c55;
  background: #fff0f3;
}

.analysis-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.analysis-block {
  padding: 12px 14px;
  border-radius: 10px;
  background: #f7f8fa;
}

.analysis-block.full {
  margin-top: 14px;
}

.block-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 8px;
}

.block-title.positive {
  color: #00a870;
}

.block-title.negative {
  color: #ff2c55;
}

.analysis-block ul {
  padding-left: 18px;
  line-height: 1.9;
  color: var(--text-regular);
  font-size: 13px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
