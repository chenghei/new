<template>
  <div class="ai-contents-page">
    <el-card class="table-card">
      <div class="toolbar">
        <div class="filters">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索生成内容 / 入参"
            clearable
            style="width: 240px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select v-model="filters.scene" placeholder="内容类型" clearable style="width: 170px" @change="handleSearch">
            <el-option label="AI商品文案生成" value="product-copy" />
            <el-option label="AI评价分析" value="review-analysis" />
          </el-select>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>
        <el-button @click="loadContents"><el-icon><Refresh /></el-icon> 刷新</el-button>
      </div>

      <el-table :data="contents" v-loading="loading" stripe>
        <el-table-column label="生成时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="内容类型" width="160">
          <template #default="{ row }">
            <el-tag :type="getAiScene(row.scene).tag" effect="light">
              {{ row.scene_name || getAiScene(row.scene).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="生成者" width="140">
          <template #default="{ row }">{{ row.user?.nickname || row.user?.username || '-' }}</template>
        </el-table-column>
        <el-table-column label="输入信息" min-width="180">
          <template #default="{ row }">
            <span class="ellipsis-2 summary">{{ row.input || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="AI 生成内容" min-width="280">
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
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">查看</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无 AI 生成内容" :image-size="90" />
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
          @current-change="loadContents"
        />
      </div>
    </el-card>

    <!-- 内容详情 -->
    <el-dialog v-model="detailVisible" title="AI 生成内容详情" width="640px" top="6vh">
      <template v-if="current">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="内容类型">
            {{ current.scene_name || getAiScene(current.scene).text }}
          </el-descriptions-item>
          <el-descriptions-item label="生成者">
            {{ current.user?.nickname || current.user?.username || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="模型">{{ current.model || '-' }}</el-descriptions-item>
          <el-descriptions-item label="生成时间">{{ formatDateTime(current.created_at) }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-block">
          <div class="block-title">输入信息</div>
          <div class="block-text">{{ current.input || '-' }}</div>
        </div>
        <div class="detail-block">
          <div class="block-title">生成内容</div>
          <div class="block-text">{{ current.output || '-' }}</div>
        </div>
      </template>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAiContents, deleteAiLog } from '@/api/ai'
import { formatDateTime, getAiScene } from '@/utils/format'

const contents = ref([])
const loading = ref(false)
const detailVisible = ref(false)
const current = ref(null)

const filters = reactive({ keyword: '', scene: '' })
const pagination = reactive({ page: 1, limit: 10, total: 0 })

const loadContents = async () => {
  loading.value = true
  try {
    const params = { page: pagination.page, limit: pagination.limit }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.scene) params.scene = filters.scene

    const res = await getAiContents(params)
    contents.value = res.data.contents || []
    pagination.total = res.data.pagination?.total || 0
  } catch (error) {
    contents.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadContents()
}

const resetFilters = () => {
  filters.keyword = ''
  filters.scene = ''
  pagination.page = 1
  loadContents()
}

const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadContents()
}

const openDetail = (row) => {
  current.value = row
  detailVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该条生成内容吗？', '删除内容', {
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
    loadContents()
  } catch (error) {
    /* 已提示 */
  }
}

onMounted(loadContents)
</script>

<style scoped>
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

.block-text {
  padding: 12px 14px;
  border-radius: 8px;
  background: #f7f8fa;
  color: var(--text-regular);
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 260px;
  overflow-y: auto;
}
</style>
