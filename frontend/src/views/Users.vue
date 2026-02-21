<template>
  <Layout>
    <div class="users">
      <div class="users-header">
        <h2>用户管理</h2>
        <p>管理系统中的所有用户</p>
      </div>

      <el-card>
        <!-- 搜索和筛选 -->
        <div class="search-bar">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-input
                v-model="searchForm.search"
                placeholder="搜索用户名、邮箱或昵称"
                prefix-icon="Search"
                clearable
                @clear="handleSearch"
                @keyup.enter="handleSearch"
              />
            </el-col>
            <el-col :span="4">
              <el-select
              v-model="searchForm.role"
              placeholder="角色筛选"
              clearable
              @change="handleSearch"
            >
              <el-option label="管理员" value="admin" />
              <el-option label="商户" value="merchant" />
              <el-option label="普通用户" value="user" />
            </el-select>
            </el-col>
            <el-col :span="4">
              <el-button type="primary" @click="handleSearch">
                <el-icon><Search /></el-icon>
                搜索
              </el-button>
            </el-col>
          </el-row>
        </div>

        <!-- 用户表格 -->
        <el-table
          v-loading="loading"
          :data="users"
          style="width: 100%; margin-top: 20px"
        >
          <el-table-column prop="id" label="ID" width="80" />

          <el-table-column label="头像" width="80">
            <template #default="{ row }">
              <el-avatar :src="row.avatar" :size="40">
                <el-icon><User /></el-icon>
              </el-avatar>
            </template>
          </el-table-column>

          <el-table-column prop="username" label="用户名" />

          <el-table-column prop="email" label="邮箱" />

          <el-table-column prop="nickname" label="昵称" />

          <el-table-column label="角色">
            <template #default="{ row }">
              <el-tag :type="getRoleType(row.role)">
                {{ getRoleName(row.role) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="状态">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'warning'">
                {{ row.status === "active" ? "正常" : "禁用" }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="创建时间">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" fixed="right" width="280">
            <template #default="{ row }">
              <el-space>
                <el-button size="small" @click="viewUser(row)">
                  查看
                </el-button>
                <el-button
                  v-if="userStore.isAdmin && row.id !== userStore.userInfo?.id"
                  size="small"
                  type="primary"
                  @click="showChangeRoleDialog(row)"
                >
                  修改角色
                </el-button>
                <el-button
                  v-if="row.id !== userStore.userInfo?.id"
                  size="small"
                  :type="row.status === 'active' ? 'warning' : 'success'"
                  @click="toggleStatus(row)"
                >
                  {{ row.status === "active" ? "禁用" : "启用" }}
                </el-button>
                <el-button
                  v-if="row.id !== userStore.userInfo?.id"
                  size="small"
                  type="danger"
                  @click="deleteUser(row)"
                >
                  删除
                </el-button>
              </el-space>
            </template>
          </el-table-column>
        </el-table>

        <!-- 修改角色对话框 -->
        <el-dialog v-model="roleDialogVisible" title="修改用户角色" width="400px">
          <el-form :model="roleForm" :rules="roleRules" ref="roleFormRef" label-width="100px">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="roleForm.username" disabled />
            </el-form-item>
            <el-form-item label="当前角色" prop="currentRole">
              <el-tag :type="getRoleType(roleForm.currentRole)">
                {{ getRoleName(roleForm.currentRole) }}
              </el-tag>
            </el-form-item>
            <el-form-item label="新角色" prop="newRole">
              <el-select v-model="roleForm.newRole" placeholder="请选择新角色">
                <el-option label="管理员" value="admin" />
                <el-option label="商户" value="merchant" />
                <el-option label="普通用户" value="user" />
              </el-select>
            </el-form-item>
          </el-form>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="roleDialogVisible = false">取消</el-button>
              <el-button type="primary" @click="changeRole">确定</el-button>
            </span>
          </template>
        </el-dialog>

        <!-- 分页 -->
        <div class="pagination">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handlePageSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </el-card>

      <!-- 用户详情对话框 -->
      <el-dialog v-model="dialogVisible" title="用户详情" width="500px">
        <div v-if="selectedUser" class="user-detail">
          <div class="detail-item">
            <span class="label">用户名：</span>
            <span class="value">{{ selectedUser.username }}</span>
          </div>
          <div class="detail-item">
            <span class="label">邮箱：</span>
            <span class="value">{{ selectedUser.email }}</span>
          </div>
          <div class="detail-item">
            <span class="label">昵称：</span>
            <span class="value">{{ selectedUser.nickname || "-" }}</span>
          </div>
          <div class="detail-item">
            <span class="label">角色：</span>
            <el-tag
              :type="getRoleType(selectedUser.role)"
            >
              {{ getRoleName(selectedUser.role) }}
            </el-tag>
          </div>
          <div class="detail-item">
            <span class="label">状态：</span>
            <el-tag
              :type="selectedUser.status === 'active' ? 'success' : 'warning'"
            >
              {{ selectedUser.status === "active" ? "正常" : "禁用" }}
            </el-tag>
          </div>
          <div class="detail-item">
            <span class="label">注册时间：</span>
            <span class="value">{{ formatDate(selectedUser.created_at) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">更新时间：</span>
            <span class="value">{{ formatDate(selectedUser.updated_at) }}</span>
          </div>
        </div>
      </el-dialog>
    </div>
  </Layout>
</template>

<script setup>
import { reactive, ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useUserStore } from "@/store/user";
import {
  getUsers,
  deleteUser as deleteUserApi,
  toggleUserStatus,
  updateUser
} from "@/api/user";
import Layout from "@/components/Layout.vue";

const userStore = useUserStore();

const loading = ref(false);
const dialogVisible = ref(false);
const selectedUser = ref(null);
const roleDialogVisible = ref(false);
const roleFormRef = ref(null);

const users = ref([]);

const searchForm = reactive({
  search: "",
  role: "",
});

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
});

const roleForm = reactive({
  userId: null,
  username: "",
  currentRole: "",
  newRole: ""
});

const roleRules = reactive({
  newRole: [
    { required: true, message: "请选择新角色", trigger: "change" }
  ]
});

const formatDate = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString();
};

// 根据角色值获取角色名称
const getRoleName = (role) => {
  switch (role) {
    case "admin":
      return "管理员";
    case "merchant":
      return "商户";
    case "user":
      return "普通用户";
    default:
      return "未知角色";
  }
};

// 根据角色值获取角色标签类型
const getRoleType = (role) => {
  switch (role) {
    case "admin":
      return "danger";
    case "merchant":
      return "warning";
    case "user":
      return "primary";
    default:
      return "info";
  }
};

// 显示修改角色对话框
const showChangeRoleDialog = (user) => {
  roleForm.userId = user.id;
  roleForm.username = user.username;
  roleForm.currentRole = user.role;
  roleForm.newRole = user.role;
  roleDialogVisible.value = true;
};

// 提交角色修改
const changeRole = async () => {
  if (!roleFormRef.value) return;

  roleFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        await updateUser(roleForm.userId, { role: roleForm.newRole });
        ElMessage.success("角色修改成功");
        roleDialogVisible.value = false;
        loadUsers();
      } catch (error) {
        console.error("角色修改失败:", error);
        ElMessage.error("角色修改失败");
      }
    }
  });
};

const loadUsers = async () => {
  loading.value = true;

  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      search: searchForm.search,
      role: searchForm.role,
    };

    const response = await getUsers(params);
    const { users: userList, pagination: paginationData } = response.data;

    users.value = userList;
    pagination.total = paginationData.total;
  } catch (error) {
    console.error("加载用户列表失败:", error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  loadUsers();
};

const handlePageChange = (page) => {
  pagination.page = page;
  loadUsers();
};

const handlePageSizeChange = (size) => {
  pagination.limit = size;
  pagination.page = 1;
  loadUsers();
};

const viewUser = (user) => {
  selectedUser.value = user;
  dialogVisible.value = true;
};

const toggleStatus = async (user) => {
  try {
    const action = user.status === "active" ? "禁用" : "启用";
    await ElMessageBox.confirm(
      `确定要${action}用户 "${user.username}" 吗？`,
      "提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    await toggleUserStatus(user.id);
    ElMessage.success(`用户${action}成功`);
    loadUsers();
  } catch (error) {
    if (error !== "cancel") {
      console.error("切换用户状态失败:", error);
    }
  }
};

const deleteUser = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 "${user.username}" 吗？此操作不可恢复！`,
      "警告",
      {
        confirmButtonText: "确定删除",
        cancelButtonText: "取消",
        type: "error",
      }
    );

    await deleteUserApi(user.id);
    ElMessage.success("用户删除成功");
    loadUsers();
  } catch (error) {
    if (error !== "cancel") {
      console.error("删除用户失败:", error);
    }
  }
};

onMounted(() => {
  loadUsers();
});
</script>

<style scoped>
.users {
  /* max-width: 1200px; */
  margin: 0 auto;
}

.users-header {
  margin-bottom: 30px;
}

.users-header h2 {
  color: #333;
  margin-bottom: 8px;
}

.users-header p {
  color: #666;
  font-size: 14px;
}

.search-bar {
  margin-bottom: 20px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.user-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-item .label {
  font-weight: 500;
  color: #333;
  width: 80px;
  flex-shrink: 0;
}

.detail-item .value {
  color: #666;
}
</style>