<template>
  <div class="products-page">
    <el-card class="table-card">
      <div class="toolbar">
        <div class="filters">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索商品名称"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select
            v-model="filters.category_id"
            placeholder="商品分类"
            clearable
            filterable
            style="width: 160px"
            @change="handleSearch"
          >
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
          <el-select v-model="filters.status" placeholder="上架状态" clearable style="width: 140px" @change="handleSearch">
            <el-option label="已上架" value="active" />
            <el-option label="已下架" value="inactive" />
          </el-select>
          <el-select v-model="filters.audit_status" placeholder="审核状态" clearable style="width: 140px" @change="handleSearch">
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="未通过" value="rejected" />
          </el-select>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>
      </div>

      <el-table :data="products" v-loading="loading" stripe>
        <el-table-column label="商品信息" min-width="240">
          <template #default="{ row }">
            <div class="table-goods">
              <el-image :src="resolveImage(row.image)" fit="cover" class="table-goods-img">
                <template #error>
                  <div class="table-goods-img-fallback"><el-icon><Picture /></el-icon></div>
                </template>
              </el-image>
              <div class="goods-meta">
                <p class="goods-name ellipsis-2">{{ row.name }}</p>
                <p class="sub-text">ID：{{ row.id }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="110">
          <template #default="{ row }">{{ row.category?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="商家" width="130">
          <template #default="{ row }">
            {{ row.merchant?.nickname || row.merchant?.username || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="价格" width="110">
          <template #default="{ row }"><span class="price">¥{{ formatPrice(row.price) }}</span></template>
        </el-table-column>
        <el-table-column label="库存" width="80" prop="stock" />
        <el-table-column label="销量" width="80" prop="sales" />
        <el-table-column label="上架状态" width="100">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 'active'"
              :loading="row._switching"
              @change="(val) => toggleStatus(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="审核状态" width="110">
          <template #default="{ row }">
            <el-tooltip
              v-if="row.audit_status === 'rejected'"
              :content="row.audit_remark || '审核未通过'"
              placement="top"
            >
              <el-tag :type="getAuditStatus(row.audit_status).tag" effect="light">
                {{ getAuditStatus(row.audit_status).text }}
              </el-tag>
            </el-tooltip>
            <el-tag v-else :type="getAuditStatus(row.audit_status).tag" effect="light">
              {{ getAuditStatus(row.audit_status).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.audit_status === 'pending'" link type="primary" @click="openAudit(row)">
              审核
            </el-button>
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无商品数据" :image-size="90" />
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
          @current-change="loadProducts"
        />
      </div>
    </el-card>

    <!-- 商品审核 -->
    <el-dialog v-model="auditVisible" title="商品审核" width="560px">
      <template v-if="current">
        <div class="audit-goods">
          <el-image :src="resolveImage(current.image)" fit="cover" class="audit-img">
            <template #error>
              <div class="audit-img-fallback"><el-icon><Picture /></el-icon></div>
            </template>
          </el-image>
          <div class="audit-info">
            <p class="audit-name">{{ current.name }}</p>
            <p class="sub-text">分类：{{ current.category?.name || '-' }}</p>
            <p class="sub-text">商家：{{ current.merchant?.nickname || current.merchant?.username || '-' }}</p>
            <p class="price">¥{{ formatPrice(current.price) }} · 库存 {{ current.stock }}</p>
          </div>
        </div>
        <p class="audit-desc">{{ current.description || '暂无商品描述' }}</p>

        <el-form :model="auditForm" label-width="80px" class="audit-form">
          <el-form-item label="审核结果">
            <el-radio-group v-model="auditForm.audit_status">
              <el-radio label="approved">通过</el-radio>
              <el-radio label="rejected">拒绝</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="auditForm.audit_status === 'rejected'" label="审核意见">
            <el-input
              v-model="auditForm.audit_remark"
              type="textarea"
              :rows="3"
              maxlength="200"
              show-word-limit
              placeholder="请填写审核不通过的原因，商家可据此修改后重新提交"
            />
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="auditVisible = false">取消</el-button>
        <el-button type="primary" :loading="auditing" @click="submitAudit">提交审核</el-button>
      </template>
    </el-dialog>

    <!-- 商品详情 -->
    <el-dialog v-model="detailVisible" title="商品详情" width="560px">
      <template v-if="current">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="商品名称" :span="2">{{ current.name }}</el-descriptions-item>
          <el-descriptions-item label="分类">{{ current.category?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="商家">
            {{ current.merchant?.nickname || current.merchant?.username || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="价格">¥{{ formatPrice(current.price) }}</el-descriptions-item>
          <el-descriptions-item label="库存">{{ current.stock }}</el-descriptions-item>
          <el-descriptions-item label="销量">{{ current.sales }}</el-descriptions-item>
          <el-descriptions-item label="上架状态">
            {{ current.status === 'active' ? '已上架' : '已下架' }}
          </el-descriptions-item>
          <el-descriptions-item label="审核状态">
            <el-tag :type="getAuditStatus(current.audit_status).tag" effect="light">
              {{ getAuditStatus(current.audit_status).text }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(current.created_at) }}</el-descriptions-item>
        </el-descriptions>
        <p class="detail-desc">{{ current.description || '暂无商品描述' }}</p>
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
import { getProducts, updateProduct, deleteProduct, auditProduct } from '@/api/product'
import { getCategories } from '@/api/category'
import { resolveImage, formatPrice, formatDateTime, getAuditStatus } from '@/utils/format'

const categories = ref([])
const products = ref([])
const loading = ref(false)
const auditing = ref(false)

const auditVisible = ref(false)
const detailVisible = ref(false)
const current = ref(null)
const auditForm = reactive({ audit_status: 'approved', audit_remark: '' })

const filters = reactive({ keyword: '', category_id: null, status: '', audit_status: '' })
const pagination = reactive({ page: 1, limit: 10, total: 0 })

const loadProducts = async () => {
  loading.value = true
  try {
    const params = { page: pagination.page, limit: pagination.limit, sortBy: 'created_at', order: 'desc' }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.category_id) params.category_id = filters.category_id
    if (filters.status) params.status = filters.status
    if (filters.audit_status) params.audit_status = filters.audit_status

    const res = await getProducts(params)
    products.value = (res.data.products || []).map((p) => ({ ...p, _switching: false }))
    pagination.total = res.data.pagination?.total || 0
  } catch (error) {
    products.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const loadCategories = async () => {
  try {
    const res = await getCategories()
    categories.value = res.data.users || []
  } catch (error) {
    categories.value = []
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadProducts()
}

const resetFilters = () => {
  filters.keyword = ''
  filters.category_id = null
  filters.status = ''
  filters.audit_status = ''
  pagination.page = 1
  loadProducts()
}

const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadProducts()
}

const openAudit = (row) => {
  current.value = row
  auditForm.audit_status = 'approved'
  auditForm.audit_remark = row.audit_remark || ''
  auditVisible.value = true
}

const submitAudit = async () => {
  if (auditForm.audit_status === 'rejected' && !auditForm.audit_remark.trim()) {
    ElMessage.warning('请填写审核意见')
    return
  }
  auditing.value = true
  try {
    await auditProduct(current.value.id, {
      audit_status: auditForm.audit_status,
      audit_remark: auditForm.audit_remark
    })
    ElMessage.success(auditForm.audit_status === 'approved' ? '商品审核通过' : '已拒绝该商品')
    auditVisible.value = false
    loadProducts()
  } catch (error) {
    /* 已提示 */
  } finally {
    auditing.value = false
  }
}

const openDetail = (row) => {
  current.value = row
  detailVisible.value = true
}

const toggleStatus = async (row, val) => {
  row._switching = true
  try {
    await updateProduct(row.id, { status: val ? 'active' : 'inactive' })
    row.status = val ? 'active' : 'inactive'
    ElMessage.success(val ? '商品已上架' : '商品已下架')
  } catch (error) {
    /* 已提示 */
  } finally {
    row._switching = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除商品「${row.name}」吗？删除后不可恢复。`, '删除商品', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await deleteProduct(row.id)
    ElMessage.success('删除成功')
    loadProducts()
  } catch (error) {
    /* 已提示 */
  }
}

onMounted(() => {
  loadCategories()
  loadProducts()
})
</script>

<style scoped>
.table-card {
  border-radius: var(--radius);
  border: none;
  box-shadow: var(--shadow-card);
}

.goods-meta {
  min-width: 0;
}

.goods-name {
  font-size: 14px;
  line-height: 20px;
}

.audit-goods {
  display: flex;
  gap: 16px;
  padding: 14px;
  border-radius: 10px;
  background: #f7f8fa;
}

.audit-img,
.audit-img-fallback {
  width: 88px;
  height: 88px;
  border-radius: 8px;
  flex-shrink: 0;
}

.audit-img-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eee;
  color: #c8c8c8;
}

.audit-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.audit-name {
  font-size: 15px;
  font-weight: 600;
}

.audit-desc,
.detail-desc {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #f7f8fa;
  color: var(--text-regular);
  line-height: 1.8;
  white-space: pre-wrap;
}

.audit-form {
  margin-top: 18px;
}
</style>
