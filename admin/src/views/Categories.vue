<template>
  <div class="categories-page">
    <el-card class="table-card">
      <div class="toolbar">
        <div class="filters">
          <el-input
            v-model="filters.search"
            placeholder="搜索分类名称"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>
        <el-button type="primary" @click="openCreate">
          <el-icon><Plus /></el-icon> 新增分类
        </el-button>
      </div>

      <el-table :data="categories" v-loading="loading" stripe>
        <el-table-column label="ID" width="80" prop="id" />
        <el-table-column label="分类名称" min-width="160" prop="name" />
        <el-table-column label="分类描述" min-width="240">
          <template #default="{ row }">
            <span class="desc">{{ row.description || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="排序" width="90" prop="sort" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 'active'"
              :loading="row._loading"
              active-text="启用"
              inactive-text="禁用"
              inline-prompt
              @change="(val) => toggleStatus(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无分类，点击右上角新增" :image-size="90" />
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
          @current-change="loadCategories"
        />
      </div>
    </el-card>

    <!-- 新增 / 编辑分类 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑分类' : '新增分类'" width="480px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分类名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="分类描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="请输入分类描述（选填）"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :step="1" />
          <span class="sort-tip">数值越小越靠前</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">禁用</el-radio>
          </el-radio-group>
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
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/api/category'
import { formatDateTime } from '@/utils/format'

const categories = ref([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref(null)
const formRef = ref()

const filters = reactive({ search: '' })
const pagination = reactive({ page: 1, limit: 10, total: 0 })

const defaultForm = () => ({ name: '', description: '', sort: 0, status: 'active' })
const form = reactive(defaultForm())

const rules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }]
}

const loadCategories = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      sortBy: 'sort',
      order: 'asc'
    }
    if (filters.search) params.search = filters.search

    const res = await getCategories(params)
    categories.value = (res.data.users || []).map((c) => ({ ...c, _loading: false }))
    pagination.total = res.data.pagination?.total || 0
  } catch (error) {
    categories.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadCategories()
}

const resetFilters = () => {
  filters.search = ''
  pagination.page = 1
  loadCategories()
}

const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadCategories()
}

const openCreate = () => {
  isEdit.value = false
  editingId.value = null
  Object.assign(form, defaultForm())
  dialogVisible.value = true
}

const openEdit = (row) => {
  isEdit.value = true
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    description: row.description || '',
    sort: row.sort ?? 0,
    status: row.status || 'active'
  })
  dialogVisible.value = true
}

const handleSave = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    if (isEdit.value) {
      await updateCategory(editingId.value, { ...form })
      ElMessage.success('分类已更新')
    } else {
      await createCategory({ ...form })
      ElMessage.success('分类已新增')
    }
    dialogVisible.value = false
    loadCategories()
  } catch (error) {
    /* 已提示 */
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (row, val) => {
  row._loading = true
  try {
    await updateCategory(row.id, { status: val ? 'active' : 'inactive' })
    row.status = val ? 'active' : 'inactive'
    ElMessage.success(val ? '分类已启用' : '分类已禁用')
  } catch (error) {
    /* 已提示 */
  } finally {
    row._loading = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除分类「${row.name}」吗？`, '删除分类', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await deleteCategory(row.id)
    ElMessage.success('删除成功')
    loadCategories()
  } catch (error) {
    /* 已提示（如分类下有商品会返回错误） */
  }
}

onMounted(loadCategories)
</script>

<style scoped>
.table-card {
  border-radius: var(--radius);
  border: none;
  box-shadow: var(--shadow-card);
}

.desc {
  color: var(--text-regular);
}

.sort-tip {
  margin-left: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
