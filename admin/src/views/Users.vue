<template>
  <div class="users-page">
    <el-card class="table-card">
      <div class="toolbar">
        <div class="filters">
          <el-input
            v-model="filters.search"
            placeholder="搜索用户名 / 邮箱 / 昵称"
            clearable
            style="width: 240px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select v-model="filters.role" placeholder="用户角色" clearable style="width: 140px" @change="handleSearch">
            <el-option label="普通用户" value="user" />
            <el-option label="商家" value="merchant" />
            <el-option label="管理员" value="admin" />
          </el-select>
          <el-select v-model="filters.status" placeholder="账号状态" clearable style="width: 140px" @change="handleSearch">
            <el-option label="正常" value="active" />
            <el-option label="已禁用" value="inactive" />
          </el-select>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>
      </div>

      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column label="用户" min-width="200">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="36" :src="resolveImage(row.avatar)">
                <el-icon><User /></el-icon>
              </el-avatar>
              <div>
                <p class="name">{{ row.nickname || row.username }}</p>
                <p class="sub-text">@{{ row.username }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="邮箱" min-width="180" prop="email" />
        <el-table-column label="手机号" width="130">
          <template #default="{ row }">{{ row.phone || '-' }}</template>
        </el-table-column>
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="getRole(row.role).tag" effect="light">{{ getRole(row.role).text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="实名认证" width="110">
          <template #default="{ row }">
            <el-tag :type="row.id_verified ? 'success' : 'info'" effect="plain" size="small">
              {{ row.id_verified ? '已认证' : '未认证' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="账号状态" width="110">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 'active'"
              :loading="row._loading"
              :disabled="row.role === 'admin'"
              @change="(val) => toggleStatus(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无用户数据" :image-size="90" />
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
          @current-change="loadUsers"
        />
      </div>
    </el-card>

    <!-- 用户详情 -->
    <el-dialog v-model="detailVisible" title="用户详情" width="520px">
      <el-descriptions v-if="current" :column="1" border>
        <el-descriptions-item label="用户ID">{{ current.id }}</el-descriptions-item>
        <el-descriptions-item label="用户名">{{ current.username }}</el-descriptions-item>
        <el-descriptions-item label="昵称">{{ current.nickname || '-' }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ current.email }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ current.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="角色">{{ getRole(current.role).text }}</el-descriptions-item>
        <el-descriptions-item label="账号状态">
          <el-tag :type="current.status === 'active' ? 'success' : 'danger'" effect="light">
            {{ current.status === 'active' ? '正常' : '已禁用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="实名认证">
          {{ current.id_verified ? `已认证（${current.real_name || '-'}）` : '未认证' }}
        </el-descriptions-item>
        <el-descriptions-item label="注册时间">{{ formatDateTime(current.created_at) }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUsers, toggleUserStatus } from '@/api/user'
import { resolveImage, formatDateTime, getRole } from '@/utils/format'

const users = ref([])
const loading = ref(false)
const detailVisible = ref(false)
const current = ref(null)

const filters = reactive({ search: '', role: '', status: '' })
const pagination = reactive({ page: 1, limit: 10, total: 0 })

const loadUsers = async () => {
  loading.value = true
  try {
    const params = { page: pagination.page, limit: pagination.limit }
    if (filters.search) params.search = filters.search
    if (filters.role) params.role = filters.role
    if (filters.status) params.status = filters.status

    const res = await getUsers(params)
    users.value = (res.data.users || []).map((u) => ({ ...u, _loading: false }))
    pagination.total = res.data.pagination?.total || 0
  } catch (error) {
    users.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadUsers()
}

const resetFilters = () => {
  filters.search = ''
  filters.role = ''
  filters.status = ''
  pagination.page = 1
  loadUsers()
}

const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadUsers()
}

const toggleStatus = async (row, val) => {
  try {
    await ElMessageBox.confirm(
      `确定要${val ? '启用' : '禁用'}用户「${row.nickname || row.username}」吗？`,
      '账号状态管理',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  row._loading = true
  try {
    await toggleUserStatus(row.id)
    row.status = val ? 'active' : 'inactive'
    ElMessage.success(val ? '账号已启用' : '账号已禁用')
  } catch (error) {
    /* 已提示 */
  } finally {
    row._loading = false
  }
}

const openDetail = (row) => {
  current.value = row
  detailVisible.value = true
}

onMounted(loadUsers)
</script>

<style scoped>
.table-card {
  border-radius: var(--radius);
  border: none;
  box-shadow: var(--shadow-card);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-cell .name {
  font-size: 14px;
  color: var(--text-primary);
}
</style>
