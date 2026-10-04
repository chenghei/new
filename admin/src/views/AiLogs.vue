<template>
  <div class="ai-logs-page">
    <!-- 概览 -->
    <div class="stat-grid">
      <div class="stat-card" v-for="item in statCards" :key="item.label">
        <div class="stat-icon" :style="{ background: item.bg, color: item.color }">
          <el-icon size="20"><component :is="item.icon" /></el-icon>
        </div>
        <div>
          <p class="stat-value">{{ item.value }}<span v-if="item.unit" class="unit">{{ item.unit }}</span></p>
          <p class="stat-label">{{ item.label }}</p>
        </div>
      </div>
    </div>

    <el-card class="table-card">
      <div class="toolbar">
        <div class="filters">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索入参 / 输出内容"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select v-model="filters.scene" placeholder="调用场景" clearable style="width: 170px" @change="handleSearch">
            <el-option v-for="(v, k) in AI_SCENE" :key="k" :label="v.text" :value="k" />
          </el-select>
          <el-select v-model="filters.status" placeholder="调用状态" clearable style="width: 140px" @change="handleSearch">
            <el-option label="成功" value="success" />
            <el-option label="失败" value="failed" />
          </el-select>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>
        <el-button @click="loadLogs"><el-icon><Refresh /></el-icon> 刷新</el-button>
      </div>

      <el-table :data="logs" v-loading="loading" stripe>
        <el-table-column label="调用时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="调用场景" width="160">
          <template #default="{ row }">
            <el-tag :type="getAiScene(row.scene).tag" effect="light">
              {{ row.scene_name || getAiScene(row.scene).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="调用者" width="140">
          <template #default="{ row }">{{ row.user?.nickname || row.user?.username || '游客' }}</template>
        </el-table-column>
        <el-table-column label="入参摘要" min-width="200">
          <template #default="{ row }">
            <span class="ellipsis-2 summary">{{ row.input || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="输出摘要" min-width="220">
          <template #default="{ row }">
            <span class="ellipsis-2 summary">{{ (row.output || '-').replace(/\n/g, ' ') }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'" effect="light">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="90">
          <template #default="{ row }">{{ row.duration_ms }}ms</template>
        </el-table-column>
        <el-table-column label="模型" width="130">
          <template #default="{ row }">{{ row.model || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无 AI 调用记录" :image-size="90" />
        </template>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="loadLogs"
        />
      </div>
    </el-card>

    <!-- 调用详情 -->
    <el-dialog v-model="detailVisible" title="AI 调用详情" width="640px" top="6vh">
      <template v-if="current">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="调用场景">
            {{ current.scene_name || getAiScene(current.scene).text }}
          </el-descriptions-item>
          <el-descriptions-item label="调用者">
            {{ current.user?.nickname || current.user?.username || '游客' }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="current.status === 'success' ? 'success' : 'danger'" effect="light">
              {{ current.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="耗时">{{ current.duration_ms }} ms</el-descriptions-item>
          <el-descriptions-item label="模型">{{ current.model || '-' }}</el-descriptions-item>
          <el-descriptions-item label="调用时间">{{ formatDateTime(current.created_at) }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-block">
          <div class="block-title">调用入参</div>
          <div class="block-text">{{ current.input || '-' }}</div>
        </div>
        <div class="detail-block">
          <div class="block-title">AI 输出内容</div>
          <div class="block-text">{{ current.output || '-' }}</div>
        </div>
        <div v-if="current.error_message" class="detail-block">
          <div class="block-title error">错误信息</div>
          <div class="block-text error">{{ current.error_message }}</div>
        </div>
      </template>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAiLogs, deleteAiLog } from '@/api/ai'
import { formatDateTime, getAiScene, AI_SCENE } from '@/utils/format'

const logs = ref([])
const loading = ref(false)
const stats = ref({})
const detailVisible = ref(false)
const current = ref(null)

const filters = reactive({ keyword: '', scene: '', status: '' })
const pagination = reactive({ page: 1, limit: 10, total: 0 })

const statCards = computed(() => {
  const s = stats.value
  return [
    { label: '调用总数', value: s.total ?? 0, icon: 'DataLine', bg: '#eaf2ff', color: '#2f7bff' },
    { label: '成功调用', value: s.successCount ?? 0, icon: 'CircleCheck', bg: '#e8f8f2', color: '#00a870' },
    { label: '失败调用', value: s.failedCount ?? 0, icon: 'CircleClose', bg: '#fff0f3', color: '#ff2c55' },
    { label: '今日调用', value: s.todayCount ?? 0, icon: 'Calendar', bg: '#fff7e6', color: '#ff8f1f' },
    { label: '平均耗时', value: s.avgDuration ?? 0, unit: 'ms', icon: 'Timer', bg: '#f4f0ff', color: '#8a5cf6' }
  ]
})

const loadLogs = async () => {
  loading.value = true
  try {
    const params = { page: pagination.page, limit: pagination.limit }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.scene) params.scene = filters.scene
    if (filters.status) params.status = filters.status

    const res = await getAiLogs(params)
    logs.value = res.data.logs || []
    stats.value = res.data.stats || {}
    pagination.total = res.data.pagination?.total || 0
  } catch (error) {
    logs.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadLogs()
}

const resetFilters = () => {
  filters.keyword = ''
  filters.scene = ''
  filters.status = ''
  pagination.page = 1
  loadLogs()
}

const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadLogs()
}

const openDetail = (row) => {
  current.value = row
  detailVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该条调用记录吗？', '删除记录', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await deleteAiLog(row.id)
    ElMessage.success('删除成功')
    loadLogs()
  } catch (error) {
    /* 已提示 */
  }
}

onMounted(loadLogs)
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
}

.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-value {
  font-size: 20px;
  font-weight: 800;
  line-height: 1.2;
}

.stat-value .unit {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 2px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.table-card {
  border-radius: var(--radius);
  border: none;
  box-shadow: var(--shadow-card);
}

.summary {
  font-size: 13px;
  color: var(--text-regular);
}

.detail-block {
  margin-top: 16px;
}

.block-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.block-title.error {
  color: #ff2c55;
}

.block-text {
  padding: 12px 14px;
  border-radius: 8px;
  background: #f7f8fa;
  color: var(--text-regular);
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 220px;
  overflow-y: auto;
}

.block-text.error {
  background: #fff0f3;
  color: #ff2c55;
}

@media (max-width: 1200px) {
  .stat-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
