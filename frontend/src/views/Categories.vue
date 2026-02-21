<template>
  <Layout>
    <div class="categories">
      <div class="categories-header">
        <h2>分类管理</h2>
        <p>管理商品分类，支持分类查询和排序</p>
      </div>

      <el-card>
        <!-- 操作栏 -->
        <div class="action-bar">
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            新增分类
          </el-button>
        </div>

        <!-- 搜索和排序 -->
        <div class="search-bar">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-input
                v-model="searchForm.search"
                placeholder="搜索分类名称"
                prefix-icon="Search"
                clearable
                @clear="handleSearch"
                @keyup.enter="handleSearch"
              />
            </el-col>
            <el-col :span="6">
              <el-select
                v-model="searchForm.sortBy"
                placeholder="排序字段"
                @change="handleSearch"
              >
                <el-option label="排序号" value="sort" />
                <el-option label="创建时间" value="created_at" />
              </el-select>
            </el-col>
            <el-col :span="4">
              <el-select
                v-model="searchForm.order"
                placeholder="排序方式"
                @change="handleSearch"
              >
                <el-option label="升序" value="asc" />
                <el-option label="降序" value="desc" />
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

        <!-- 分类表格 -->
        <el-table
          v-loading="loading"
          :data="categories"
          style="width: 100%; margin-top: 20px"
        >
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="分类名称"  />
          <el-table-column prop="description" label="描述" />
          <el-table-column prop="sort" label="排序号" >
            <template #default="{ row }">
              <el-input-number
                v-model="row.sort"
                :min="0"
                :max="999"
                size="small"
                @change="(value) => handleSortChange(row.id, value)"
              />
            </template>
          </el-table-column>
          <el-table-column label="状态" >
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'warning'">
                {{ row.status === "active" ? "启用" : "禁用" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" >
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="200">
            <template #default="{ row }">
              <el-space>
                <el-button size="small" @click="showEditDialog(row)">
                  编辑
                </el-button>
                <el-button
                  size="small"
                  :type="row.status === 'active' ? 'warning' : 'success'"
                  @click="toggleStatus(row)"
                >
                  {{ row.status === "active" ? "禁用" : "启用" }}
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  @click="deleteCategory(row)"
                >
                  删除
                </el-button>
              </el-space>
            </template>
          </el-table-column>
        </el-table>
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

      <!-- 新增分类对话框 -->
      <el-dialog
        v-model="dialogVisible"
        :title="dialogType === 'add' ? '新增分类' : '编辑分类'"
        width="500px"
      >
        <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
          <el-form-item label="分类名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入分类名称" />
          </el-form-item>
          <el-form-item label="描述" prop="description">
            <el-input
              v-model="form.description"
              placeholder="请输入分类描述"
              type="textarea"
              :rows="3"
            />
          </el-form-item>
          <el-form-item label="排序号" prop="sort">
            <el-input-number
              v-model="form.sort"
              :min="0"
              :max="999"
              placeholder="请输入排序号"
            />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="form.status">
              <el-radio value="active">启用</el-radio>
              <el-radio value="inactive">禁用</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="handleSubmit">确定</el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </Layout>
</template>

<script setup>
import { reactive, ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useUserStore } from "@/store/user";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory as deleteCategoryApi,
} from "@/api/category";
import Layout from "@/components/Layout.vue";

const userStore = useUserStore();
const formRef = ref(null);

const loading = ref(false);
const dialogVisible = ref(false);
const dialogType = ref("add");
const currentCategoryId = ref(null);

const categories = ref([]);

const searchForm = reactive({
  search: "",
  sortBy: "sort",
  order: "asc",
});
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
});
const form = reactive({
  name: "",
  description: "",
  sort: 0,
  status: "active",
});

const rules = reactive({
  name: [
    { required: true, message: "请输入分类名称", trigger: "blur" },
    { min: 1, max: 50, message: "分类名称长度在1到50个字符", trigger: "blur" },
  ],
  sort: [{ required: true, message: "请输入排序号", trigger: "blur" }],
});

const formatDate = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString();
};

const loadCategories = async () => {
  loading.value = true;

  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      search: searchForm.search,
      sortBy: searchForm.sortBy,
      order: searchForm.order,
    };

    const response = await getCategories(params);
    const { users: data, pagination: paginationData } = response.data;
    console.log(data, "paginationData");
    categories.value = data;
    pagination.total = paginationData.total;
  } catch (error) {
    console.error("加载分类列表失败:", error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  loadCategories();
};

const handlePageChange = (page) => {
  pagination.page = page;
  loadCategories();
};

const handlePageSizeChange = (size) => {
  pagination.limit = size;
  pagination.page = 1;
  loadCategories();
};

const handleSortChange = async (id, value) => {
  try {
    await updateCategory(id, { sort: value });
    ElMessage.success("排序更新成功");
    loadCategories();
  } catch (error) {
    console.error("更新排序失败:", error);
    ElMessage.error("更新排序失败");
    // 重新加载数据以恢复原始排序
    loadCategories();
  }
};

const showAddDialog = () => {
  dialogType.value = "add";
  currentCategoryId.value = null;
  resetForm();
  dialogVisible.value = true;
};

const showEditDialog = (category) => {
  dialogType.value = "edit";
  currentCategoryId.value = category.id;
  form.name = category.name;
  form.description = category.description;
  form.sort = category.sort;
  form.status = category.status;
  dialogVisible.value = true;
};

const resetForm = () => {
  form.name = "";
  form.description = "";
  form.sort = 0;
  form.status = "active";
  if (formRef.value) {
    formRef.value.resetFields();
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (dialogType.value === "add") {
          await createCategory(form);
          ElMessage.success("分类创建成功");
        } else {
          await updateCategory(currentCategoryId.value, form);
          ElMessage.success("分类更新成功");
        }
        dialogVisible.value = false;
        loadCategories();
      } catch (error) {
        console.error("提交失败:", error);
      }
    }
  });
};

const toggleStatus = async (category) => {
  try {
    const action = category.status === "active" ? "禁用" : "启用";
    await ElMessageBox.confirm(
      `确定要${action}分类 "${category.name}" 吗？`,
      "提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    await updateCategory(category.id, {
      status: category.status === "active" ? "inactive" : "active",
    });
    ElMessage.success(`分类${action}成功`);
    loadCategories();
  } catch (error) {
    if (error !== "cancel") {
      console.error("切换分类状态失败:", error);
    }
  }
};

const deleteCategory = async (category) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除分类 "${category.name}" 吗？此操作不可恢复！`,
      "警告",
      {
        confirmButtonText: "确定删除",
        cancelButtonText: "取消",
        type: "error",
      }
    );

    await deleteCategoryApi(category.id);
    ElMessage.success("分类删除成功");
    loadCategories();
  } catch (error) {
    if (error !== "cancel") {
      console.error("删除分类失败:", error);
    }
  }
};

onMounted(() => {
  loadCategories();
});
</script>

<style scoped>
.categories {
  /* max-width: 1200px; */
  margin: 0 auto;
}

.categories-header {
  margin-bottom: 30px;
}

.categories-header h2 {
  color: #333;
  margin-bottom: 8px;
}

.categories-header p {
  color: #666;
  font-size: 14px;
}

.action-bar {
  margin-bottom: 20px;
}

.search-bar {
  margin-bottom: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>