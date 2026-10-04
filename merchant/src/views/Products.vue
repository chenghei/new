<template>
  <div class="products-page">
    <el-card class="toolbar-card">
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
          <el-select v-model="filters.status" placeholder="商品状态" clearable style="width: 140px" @change="handleSearch">
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
        <el-button type="primary" @click="openCreate">
          <el-icon><Plus /></el-icon> 新增商品
        </el-button>
      </div>
    </el-card>

    <el-card class="table-card">
      <el-table :data="displayProducts" v-loading="loading" stripe>
        <el-table-column label="商品信息" min-width="260">
          <template #default="{ row }">
            <div class="table-goods">
              <el-image :src="resolveImage(row.image)" fit="cover" class="table-goods-img">
                <template #error>
                  <div class="table-goods-img-fallback"><el-icon><Picture /></el-icon></div>
                </template>
              </el-image>
              <div class="goods-meta">
                <p class="goods-name ellipsis-2">{{ row.name }}</p>
                <p class="goods-id">ID：{{ row.id }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="120">
          <template #default="{ row }">{{ row.category?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="价格" width="110">
          <template #default="{ row }"><span class="price">¥{{ formatPrice(row.price) }}</span></template>
        </el-table-column>
        <el-table-column label="库存" width="90">
          <template #default="{ row }">
            <span :class="{ 'low-stock': row.stock <= 5 }">{{ row.stock }}</span>
          </template>
        </el-table-column>
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
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无商品，点击右上角新增商品" :image-size="90" />
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

    <!-- 新增 / 编辑商品 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑商品' : '新增商品'"
      width="640px"
      :close-on-click-modal="false"
    >
      <el-alert
        v-if="isEdit && form.audit_status === 'rejected'"
        type="error"
        :closable="false"
        show-icon
        class="audit-alert"
        :title="`审核未通过：${form.audit_remark || '商品信息不符合规范'}`"
        description="请根据审核意见修改商品信息，保存后将重新提交审核。"
      />
      <el-alert
        v-else-if="isEdit && form.audit_status === 'pending'"
        type="warning"
        :closable="false"
        show-icon
        class="audit-alert"
        title="该商品正在审核中"
      />

      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入商品名称" maxlength="100" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="商品分类" prop="category_id">
              <el-select
                v-model="form.category_id"
                placeholder="请选择分类"
                style="width: 100%"
                :disabled="categoryLocked"
              >
                <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
              <div v-if="categoryLocked" class="form-tip">
                由店铺经营类目「{{ shopCategoryName }}」决定，不可修改
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="价格" prop="price">
              <el-input-number v-model="form.price" :min="0" :precision="2" :step="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="库存" prop="stock">
              <el-input-number v-model="form.stock" :min="0" :step="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="上架状态">
              <el-radio-group v-model="form.status">
                <el-radio label="active">上架</el-radio>
                <el-radio label="inactive">下架</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="商品图片">
          <div class="uploader">
            <el-image :src="resolveImage(form.image)" fit="cover" class="preview-img">
              <template #error>
                <div class="preview-fallback"><el-icon><Picture /></el-icon></div>
              </template>
            </el-image>
            <el-upload :show-file-list="false" :http-request="handleUpload" accept="image/*">
              <el-button size="small" :loading="uploading">上传图片</el-button>
            </el-upload>
            <span class="upload-tip">建议 800×800，jpg / png</span>
          </div>
        </el-form-item>
        <el-form-item label="商品描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="5"
            maxlength="1000"
            show-word-limit
            placeholder="请填写商品卖点、规格、使用场景等详细介绍"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getProducts,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  uploadImg
} from '@/api/product'
import { getCategories } from '@/api/category'
import { useShopStore } from '@/store/shop'
import { resolveImage, formatPrice, getAuditStatus } from '@/utils/format'

const shopStore = useShopStore()

// 店铺经营类目：商品分类由它决定（商家在「店铺管理」中选择）
const shopCategoryId = computed(() => shopStore.shop?.category_id || null)
const shopCategoryName = computed(() => shopStore.shop?.business_category || '店铺经营类目')
const categoryLocked = computed(() => !!shopCategoryId.value)

const categories = ref([])
const products = ref([])
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref(null)
const formRef = ref()

const filters = reactive({ keyword: '', status: '', audit_status: '' })
const pagination = reactive({ page: 1, limit: 10, total: 0 })

const defaultForm = () => ({
  name: '',
  category_id: null,
  price: 0,
  stock: 100,
  status: 'active',
  image: '',
  description: '',
  audit_status: 'pending',
  audit_remark: ''
})

const form = reactive(defaultForm())

const rules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  category_id: [{ required: true, message: '请选择商品分类', trigger: 'change' }],
  price: [{ required: true, message: '请输入商品价格', trigger: 'blur' }],
  stock: [{ required: true, message: '请输入库存数量', trigger: 'blur' }]
}

// 审核状态为前端筛选，后端不支持下推该条件，这里对当前页数据做二次过滤
const displayProducts = computed(() => {
  if (!filters.audit_status) return products.value
  return products.value.filter((p) => p.audit_status === filters.audit_status)
})

const loadProducts = async () => {
  loading.value = true
  try {
    const params = {
      scope: 'mine',
      page: pagination.page,
      limit: pagination.limit,
      sortBy: 'created_at',
      order: 'desc'
    }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.status) params.status = filters.status

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
    categories.value = (res.data.users || []).filter((c) => c.status === 'active')
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

const resetForm = () => {
  Object.assign(form, defaultForm())
}

const openCreate = () => {
  isEdit.value = false
  editingId.value = null
  resetForm()
  // 默认选中店铺经营类目对应的分类
  if (shopCategoryId.value) form.category_id = shopCategoryId.value
  dialogVisible.value = true
}

const openEdit = (row) => {
  isEdit.value = true
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    category_id: shopCategoryId.value || row.category_id,
    price: Number(row.price),
    stock: row.stock,
    status: row.status,
    image: row.image || '',
    description: row.description || '',
    audit_status: row.audit_status,
    audit_remark: row.audit_remark || ''
  })
  dialogVisible.value = true
}

const handleUpload = async ({ file }) => {
  const formData = new FormData()
  formData.append('file', file)
  uploading.value = true
  try {
    const res = await uploadImg(formData)
    form.image = res.data
    ElMessage.success('图片上传成功')
  } catch (error) {
    /* 已提示 */
  } finally {
    uploading.value = false
  }
}

const handleSave = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  const payload = {
    name: form.name,
    category_id: form.category_id,
    price: form.price,
    stock: form.stock,
    status: form.status,
    image: form.image,
    description: form.description
  }

  saving.value = true
  try {
    if (isEdit.value) {
      await updateProduct(editingId.value, payload)
      ElMessage.success('保存成功，商品信息已重新提交审核')
    } else {
      await createProduct(payload)
      ElMessage.success('新增成功，商品已提交审核')
    }
    dialogVisible.value = false
    loadProducts()
  } catch (error) {
    /* 已提示 */
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (row, val) => {
  row._switching = true
  try {
    await updateProductStatus(row.id, val ? 'active' : 'inactive')
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

  // 接收 AI商品助手 生成的草稿，自动打开新增弹窗并预填
  const draft = sessionStorage.getItem('ai_product_draft')
  if (draft) {
    sessionStorage.removeItem('ai_product_draft')
    try {
      const data = JSON.parse(draft)
      openCreate()
      form.name = data.title || data.name || ''

      // 按 AI 生成结果的「卖点 + 详情」结构拼装描述，避免只填入一段无格式的纯文本
      const points = Array.isArray(data.selling_points) ? data.selling_points.filter(Boolean) : []
      const blocks = []
      if (points.length) {
        blocks.push('【商品卖点】')
        points.forEach((point, index) => blocks.push(`${index + 1}. ${point}`))
      }
      if (data.description) {
        if (blocks.length) blocks.push('')
        blocks.push('【商品详情】')
        blocks.push(data.description)
      }
      form.description = blocks.join('\n')
    } catch (e) {
      /* 忽略非法草稿 */
    }
  }
})
</script>

<style scoped>
.toolbar-card,
.table-card {
  border-radius: var(--radius);
  border: none;
  box-shadow: var(--shadow-card);
}
.toolbar-card {
  margin-bottom: 14px;
}

.form-tip {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.goods-meta {
  min-width: 0;
}

.goods-name {
  font-size: 14px;
  line-height: 20px;
  color: var(--text-primary);
}

.goods-id {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-secondary);
}

.price {
  color: var(--price-color);
  font-weight: 700;
}

.low-stock {
  color: #ff8f1f;
  font-weight: 600;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.audit-alert {
  margin-bottom: 18px;
}

.uploader {
  display: flex;
  align-items: center;
  gap: 14px;
}

.preview-img,
.preview-fallback {
  width: 80px;
  height: 80px;
  border-radius: 8px;
}

.preview-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #c8c8c8;
}

.upload-tip {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
