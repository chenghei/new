<template>
  <div class="dashboard" v-loading="loading">
    <!-- 概览卡片 -->
    <div class="stat-grid">
      <div class="stat-card" v-for="item in statCards" :key="item.label">
        <div class="stat-icon" :style="{ background: item.bg, color: item.color }">
          <el-icon size="22"><component :is="item.icon" /></el-icon>
        </div>
        <div class="stat-body">
          <p class="stat-value">{{ item.value }}<span v-if="item.unit" class="unit">{{ item.unit }}</span></p>
          <p class="stat-label">{{ item.label }}</p>
        </div>
      </div>
    </div>

    <!-- 销售趋势 + 订单状态 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :md="16">
        <el-card class="chart-card">
          <div class="card-head">
            <span class="card-title">平台销售趋势</span>
            <el-radio-group v-model="trendDays" size="small" @change="loadTrend">
              <el-radio-button :label="7">近7天</el-radio-button>
              <el-radio-button :label="30">近30天</el-radio-button>
            </el-radio-group>
          </div>
          <EChart :option="trendOption" height="320px" />
        </el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card class="chart-card">
          <div class="card-head"><span class="card-title">订单状态分布</span></div>
          <EChart :option="orderStatusOption" height="320px" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 用户增长 + 分类分布 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :md="12">
        <el-card class="chart-card">
          <div class="card-head"><span class="card-title">用户增长趋势</span></div>
          <EChart :option="userGrowthOption" height="300px" />
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card class="chart-card">
          <div class="card-head"><span class="card-title">商品分类分布</span></div>
          <EChart :option="categoryOption" height="300px" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近订单 -->
    <el-card class="chart-card">
      <div class="card-head">
        <span class="card-title">最近订单</span>
        <el-button text type="primary" @click="$router.push('/orders')">订单监管</el-button>
      </div>
      <el-table :data="recentOrders" v-loading="recentLoading">
        <el-table-column label="订单号" width="170">
          <template #default="{ row }">{{ row.order_no }}</template>
        </el-table-column>
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
        <el-table-column label="买家" width="120">
          <template #default="{ row }">{{ row.user?.nickname || row.user?.username || '-' }}</template>
        </el-table-column>
        <el-table-column label="商家" width="120">
          <template #default="{ row }">
            {{ row.product?.merchant?.nickname || row.product?.merchant?.username || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="金额" width="110">
          <template #default="{ row }"><span class="price">¥{{ formatPrice(row.total_price) }}</span></template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getOrderStatus(row.status).tag" effect="light">
              {{ getOrderStatus(row.status).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无订单数据" :image-size="80" />
        </template>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import EChart from '@/components/EChart.vue'
import {
  getStats,
  getSalesTrend,
  getUserGrowth,
  getOrderStatus as getOrderStatusApi,
  getCategoryDistribution,
  getRecentOrders
} from '@/api/stats'
import { resolveImage, formatPrice, formatDateTime, getOrderStatus as getOrderStatusMeta } from '@/utils/format'

const loading = ref(false)
const recentLoading = ref(false)
const stats = ref({})
const trend = ref({ labels: [], orders: [], sales: [] })
const growth = ref({ labels: [], users: [], merchants: [] })
const orderStatus = ref([])
const categoryDist = ref([])
const recentOrders = ref([])
const trendDays = ref(7)

const getOrderStatus = getOrderStatusMeta

const statCards = computed(() => {
  const s = stats.value
  return [
    { label: '平台用户', value: s.totalUsers ?? 0, icon: 'User', bg: '#eaf2ff', color: '#2f7bff' },
    { label: '入驻商家', value: s.totalMerchants ?? 0, icon: 'Shop', bg: '#fff7e6', color: '#ff8f1f' },
    { label: '商品总数', value: s.totalProducts ?? 0, icon: 'Goods', bg: '#fff1ec', color: '#ff4d21' },
    { label: '待审核商品', value: s.pendingProductAudit ?? 0, icon: 'Clock', bg: '#fff7e6', color: '#ff8f1f' },
    { label: '待审核店铺', value: s.pendingShopAudit ?? 0, icon: 'Stamp', bg: '#f4f0ff', color: '#8a5cf6' },
    { label: '订单总数', value: s.totalOrders ?? 0, icon: 'List', bg: '#eaf2ff', color: '#2f7bff' },
    { label: '待发货订单', value: s.pendingOrders ?? 0, icon: 'Van', bg: '#fff7e6', color: '#ff8f1f' },
    { label: '待处理售后', value: s.pendingAfterSales ?? 0, icon: 'RefreshLeft', bg: '#fff0f3', color: '#ff2c55' },
    { label: '评价总数', value: s.totalReviews ?? 0, icon: 'ChatDotRound', bg: '#f4f0ff', color: '#8a5cf6' },
    { label: '平均评分', value: s.avgRating ?? 0, unit: '分', icon: 'Star', bg: '#fff7e6', color: '#ff8f1f' },
    { label: '平台销售额', value: formatPrice(s.totalSales), unit: '元', icon: 'Money', bg: '#e8f8f2', color: '#00a870' },
    { label: '今日销售额', value: formatPrice(s.todaySales), unit: '元', icon: 'TrendCharts', bg: '#e8f8f2', color: '#00a870' },
    { label: '今日新增用户', value: s.todayUsers ?? 0, icon: 'UserFilled', bg: '#eaf2ff', color: '#2f7bff' },
    { label: '今日订单', value: s.todayOrders ?? 0, icon: 'Calendar', bg: '#fff1ec', color: '#ff4d21' }
  ]
})

const trendOption = computed(() => ({
  grid: { top: 40, left: 50, right: 24, bottom: 30 },
  tooltip: { trigger: 'axis' },
  legend: { data: ['订单数', '销售额'], right: 10, top: 6, textStyle: { color: '#86909c' } },
  xAxis: {
    type: 'category',
    data: trend.value.labels,
    boundaryGap: false,
    axisLine: { lineStyle: { color: '#e5e6eb' } },
    axisLabel: { color: '#86909c' }
  },
  yAxis: [
    { type: 'value', name: '订单数', minInterval: 1, splitLine: { lineStyle: { color: '#f2f3f5' } }, axisLabel: { color: '#86909c' } },
    { type: 'value', name: '销售额', splitLine: { show: false }, axisLabel: { color: '#86909c' } }
  ],
  series: [
    {
      name: '订单数',
      type: 'line',
      smooth: true,
      data: trend.value.orders,
      symbolSize: 7,
      itemStyle: { color: '#2f7bff' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(47,123,255,0.28)' },
            { offset: 1, color: 'rgba(47,123,255,0.02)' }
          ]
        }
      }
    },
    {
      name: '销售额',
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      data: trend.value.sales,
      symbolSize: 7,
      itemStyle: { color: '#ff4d21' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(255,77,33,0.25)' },
            { offset: 1, color: 'rgba(255,77,33,0.02)' }
          ]
        }
      }
    }
  ]
}))

const orderStatusOption = computed(() => {
  const colors = {
    pending: '#ff8f1f',
    paid: '#2f7bff',
    shipped: '#00a870',
    completed: '#86909c',
    cancelled: '#c9cdd4'
  }
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, textStyle: { color: '#86909c' } },
    series: [
      {
        type: 'pie',
        radius: ['42%', '66%'],
        center: ['50%', '44%'],
        label: { show: true, formatter: '{b}\n{d}%', color: '#4e5969' },
        data: orderStatus.value.map((item) => ({
          name: getOrderStatus(item.status).text,
          value: item.count,
          itemStyle: { color: colors[item.status] || '#c9cdd4' }
        }))
      }
    ]
  }
})

const userGrowthOption = computed(() => ({
  grid: { top: 40, left: 40, right: 20, bottom: 30 },
  tooltip: { trigger: 'axis' },
  legend: { data: ['新增用户', '新增商家'], right: 10, top: 6, textStyle: { color: '#86909c' } },
  xAxis: {
    type: 'category',
    data: growth.value.labels,
    axisLine: { lineStyle: { color: '#e5e6eb' } },
    axisLabel: { color: '#86909c' }
  },
  yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#f2f3f5' } }, axisLabel: { color: '#86909c' } },
  series: [
    {
      name: '新增用户',
      type: 'bar',
      stack: 'total',
      barWidth: 22,
      data: growth.value.users,
      itemStyle: { color: '#2f7bff', borderRadius: [0, 0, 0, 0] }
    },
    {
      name: '新增商家',
      type: 'bar',
      stack: 'total',
      barWidth: 22,
      data: growth.value.merchants,
      itemStyle: { color: '#ff8f1f', borderRadius: [6, 6, 0, 0] }
    }
  ]
}))

const categoryOption = computed(() => {
  const data = [...categoryDist.value].sort((a, b) => a.count - b.count)
  return {
    grid: { top: 20, left: 90, right: 30, bottom: 20 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#f2f3f5' } }, axisLabel: { color: '#86909c' } },
    yAxis: {
      type: 'category',
      data: data.map((c) => c.name),
      axisLine: { lineStyle: { color: '#e5e6eb' } },
      axisLabel: { color: '#86909c' }
    },
    series: [
      {
        type: 'bar',
        data: data.map((c) => c.count),
        barWidth: 16,
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#ff8f4d' },
              { offset: 1, color: '#ff4d21' }
            ]
          }
        }
      }
    ]
  }
})

const loadStats = async () => {
  try {
    const res = await getStats()
    stats.value = res.data || {}
  } catch (error) {
    stats.value = {}
  }
}

const loadTrend = async () => {
  try {
    const res = await getSalesTrend(trendDays.value)
    trend.value = res.data || { labels: [], orders: [], sales: [] }
  } catch (error) {
    trend.value = { labels: [], orders: [], sales: [] }
  }
}

const loadGrowth = async () => {
  try {
    const res = await getUserGrowth(7)
    growth.value = res.data || { labels: [], users: [], merchants: [] }
  } catch (error) {
    growth.value = { labels: [], users: [], merchants: [] }
  }
}

const loadOrderStatus = async () => {
  try {
    const res = await getOrderStatusApi()
    orderStatus.value = res.data || []
  } catch (error) {
    orderStatus.value = []
  }
}

const loadCategoryDist = async () => {
  try {
    const res = await getCategoryDistribution()
    categoryDist.value = res.data || []
  } catch (error) {
    categoryDist.value = []
  }
}

const loadRecentOrders = async () => {
  recentLoading.value = true
  try {
    const res = await getRecentOrders(8)
    recentOrders.value = res.data || []
  } catch (error) {
    recentOrders.value = []
  } finally {
    recentLoading.value = false
  }
}

onMounted(async () => {
  loading.value = true
  await Promise.all([loadStats(), loadTrend(), loadGrowth(), loadOrderStatus(), loadCategoryDist(), loadRecentOrders()])
  loading.value = false
})
</script>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: var(--shadow-card);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-value {
  font-size: 21px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-value .unit {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 3px;
}

.stat-label {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-secondary);
}

.chart-row {
  margin-bottom: 16px;
}

.chart-card {
  border-radius: var(--radius);
  border: none;
  box-shadow: var(--shadow-card);
  height: 100%;
  margin-bottom: 16px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
}

.goods-name {
  font-size: 13px;
  line-height: 19px;
}

@media (max-width: 1400px) {
  .stat-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 900px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
