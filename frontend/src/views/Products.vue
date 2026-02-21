<template>
  <Layout>
    <div class="products">
      <div class="products-header">
        <h2>商品管理</h2>
        <p>管理商品信息，支持商品查询和排序</p>
      </div>

      <el-card>
        <!-- 操作栏 -->
        <div class="action-bar">
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            新增商品
          </el-button>
        </div>

        <!-- 搜索和排序 -->
        <div class="search-bar">
          <el-row :gutter="20">
            <el-col :span="7">
              <el-input
                v-model="searchForm.name"
                placeholder="搜索商品名称"
                prefix-icon="Search"
                clearable
                @clear="handleSearch"
                @keyup.enter="handleSearch"
              />
            </el-col>
            <el-col :span="5">
              <el-select
                v-model="searchForm.category_id"
                placeholder="选择分类"
                clearable
                @change="handleSearch"
              >
                <el-option
                  v-for="category in categories"
                  :key="category.id"
                  :label="category.name"
                  :value="category.id"
                />
              </el-select>
            </el-col>
            <el-col v-if="userStore.isAdmin" :span="5">
              <el-select
                v-model="searchForm.merchant_id"
                placeholder="选择商户"
                clearable
                @change="handleSearch"
              >
                <el-option
                  v-for="merchant in merchants"
                  :key="merchant.id"
                  :label="merchant.nickname || merchant.username"
                  :value="merchant.id"
                />
              </el-select>
            </el-col>
            <el-col :span="4">
              <el-select
                v-model="searchForm.sortBy"
                placeholder="排序字段"
                @change="handleSearch"
              >
                <el-option label="创建时间" value="created_at" />
                <el-option label="商品名称" value="name" />
                <el-option label="价格" value="price" />
              </el-select>
            </el-col>
            <el-col :span="3">
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

        <!-- 商品表格 -->
        <el-table
          v-loading="loading"
          :data="products"
          style="width: 100%; margin-top: 20px"
        >
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="商品图片" prop="image" width="150">
            <template #default="{ row }">
              <el-image
                :src="row.image"
                :size="60"
                fit="cover"
              />
            </template>
          </el-table-column>
          <el-table-column prop="name" label="商品名称" />
          <el-table-column label="分类">
            <template #default="{ row }">
              {{ row.category?.name || "-" }}
            </template>
          </el-table-column>
          <el-table-column label="所属商家">
            <template #default="{ row }">
              {{ row.merchant?.nickname || row.merchant?.username || "-" }}
            </template>
          </el-table-column>
          <el-table-column prop="price" label="价格">
            <template #default="{ row }">
              {{ row.price }}
            </template>
          </el-table-column>
          <el-table-column label="状态">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'warning'">
                {{ row.status === "active" ? "上架" : "下架" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间">
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
                  {{ row.status === "active" ? "下架" : "上架" }}
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  @click="deleteProduct(row)"
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

      <!-- 新增/编辑商品对话框 -->
      <el-dialog
        v-model="dialogVisible"
        :title="dialogType === 'add' ? '新增商品' : '编辑商品'"
        width="600px"
      >
        <el-form
          :model="form"
          :rules="rules"
          ref="formRef"
          label-width="100px"
        >
          <el-form-item label="商品名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入商品名称" />
          </el-form-item>
          <el-form-item label="商品图片">
            <el-upload
              class="upload-demo"
              action="#"
              :on-preview="handlePreview"
              :on-remove="handleRemove"
              :before-remove="beforeRemove"
              :on-change="handleFileChange"
              :auto-upload="false"
              :limit="1"
              :file-list="fileList"
            >
              <el-button type="primary">
                <el-icon><Upload /></el-icon>
                选择图片
              </el-button>
              <template #tip>
                <div class="el-upload__tip">
                  只能上传jpg/png/gif文件，且不超过5MB
                </div>
              </template>
            </el-upload>
            <el-input
              v-model="form.image"
              placeholder="或输入商品图片URL"
              style="margin-top: 10px"
            />
          </el-form-item>
          <el-form-item label="商品价格" prop="price">
            <el-input-number
              v-model="form.price"
              :min="0"
              :step="0.01"
              :precision="2"
              placeholder="请输入商品价格"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="商品分类" prop="category_id">
            <el-select v-model="form.category_id" placeholder="请选择商品分类">
              <el-option
                v-for="category in categories"
                :key="category.id"
                :label="category.name"
                :value="category.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item v-if="userStore.isAdmin" label="所属商户" prop="user_id">
            <el-select v-model="form.user_id" placeholder="请选择商户">
              <el-option
                v-for="merchant in merchants"
                :key="merchant.id"
                :label="merchant.nickname || merchant.username"
                :value="merchant.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="商品状态" prop="status">
            <el-radio-group v-model="form.status">
              <el-radio :value="'active'">上架</el-radio>
              <el-radio :value="'inactive'">下架</el-radio>
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
import { reactive, ref, onMounted, computed, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useUserStore } from "@/store/user";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct as deleteProductApi,
  uploadImg,
} from "@/api/product";
import { getCategories } from "@/api/category";
import { getUsers } from "@/api/user";
import Layout from "@/components/Layout.vue";

const userStore = useUserStore();
const formRef = ref(null);

const loading = ref(false);
const dialogVisible = ref(false);
const dialogType = ref("add");
const currentProductId = ref(null);

const products = ref([]);
const categories = ref([]);
const merchants = ref([]);

const searchForm = reactive({
  name: "",
  category_id: "",
  merchant_id: "",
  sortBy: "created_at",
  order: "desc",
});

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
});

const form = reactive({
  name: "",
  image: "",
  price: 0,
  category_id: "",
  status: "active",
  user_id: "",
});

const fileList = ref([]);

const rules = reactive({
  name: [
    { required: true, message: "请输入商品名称", trigger: "blur" },
    {
      min: 1,
      max: 100,
      message: "商品名称长度在1到100个字符",
      trigger: "blur",
    },
  ],
  price: [{ required: true, message: "请输入商品价格", trigger: "blur" }],
  category_id: [{ required: true, message: "请选择商品分类", trigger: "blur" }],
});

const formatDate = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString();
};

// 加载分类列表
const loadCategories = async () => {
  try {
    const response = await getCategories();
    categories.value = response.data.users;
  } catch (error) {
    console.error("加载分类失败:", error);
  }
};

const loadMerchants = async () => {
  try {
    const response = await getUsers({ role: 'merchant' });
    merchants.value = response.data.users;
  } catch (error) {
    console.error("加载商户列表失败:", error);
  }
};
// 加载商品列表
const loadProducts = async () => {
  loading.value = true;

  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      name: searchForm.name,
      category_id: searchForm.category_id,
      sortBy: searchForm.sortBy,
      order: searchForm.order,
    };

    // 如果是管理员，添加merchant_id参数
    if (userStore.isAdmin && searchForm.merchant_id) {
      params.merchant_id = searchForm.merchant_id;
    }

    const response = await getProducts(params);
    const { products: productList, pagination: paginationData } = response.data;

    products.value = productList;
    pagination.total = paginationData.total;
  } catch (error) {
    console.error("加载商品列表失败:", error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  loadProducts();
};

const handlePageChange = (page) => {
  pagination.page = page;
  loadProducts();
};

const handlePageSizeChange = (size) => {
  pagination.limit = size;
  pagination.page = 1;
  loadProducts();
};

const showAddDialog = () => {
  dialogType.value = "add";
  currentProductId.value = null;
  dialogVisible.value = true;
  resetForm();
};

const showEditDialog = (product) => {
  dialogType.value = "edit";
  currentProductId.value = product.id;
  form.name = product.name;
  form.image = product.image;
  form.price = product.price;
  form.category_id = product.category_id;
  form.status = product.status;
  form.user_id = product.user_id;
  dialogVisible.value = true;
};

const resetForm = () => {
  form.name = "";
  form.image = "";
  form.price = 0;
  form.category_id = "";
  form.status = "active";
  form.user_id = "";
  fileList.value = [];
  if (formRef.value) {
    formRef.value.resetFields();
  }
};

// 文件上传相关方法
const handlePreview = (file) => {
  console.log(file);
};

const handleRemove = (file, uploadFiles) => {
  fileList.value = uploadFiles;
};

const beforeRemove = (file, uploadFiles) => {
  return ElMessageBox.confirm(`确定要移除 ${file.name} 吗？`);
};

const handleFileChange = async (file, uploadFiles) => {
  fileList.value = uploadFiles;
  const formData = new FormData();
  formData.append("file", fileList.value[0].raw);
  const data = await uploadImg(formData);
  form.image = data.data;
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 构建提交数据
        const submitData = { ...form };
        
        // 如果不是管理员，移除user_id字段
        if (!userStore.isAdmin) {
          delete submitData.user_id;
        }
        
        if (dialogType.value === "add") {
          await createProduct(submitData);
          ElMessage.success("商品创建成功");
        } else {
          await updateProduct(currentProductId.value, submitData);
          ElMessage.success("商品更新成功");
        }
        dialogVisible.value = false;
        fileList.value = [];
        loadProducts();
      } catch (error) {
        console.error("提交失败:", error);
      }
    }
  });
};

const toggleStatus = async (product) => {
  try {
    const action = product.status === "active" ? "下架" : "上架";
    await ElMessageBox.confirm(
      `确定要${action}商品 "${product.name}" 吗？`,
      "提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }
    );
    console.log(product);
    await updateProduct(product.id, {
      status: product.status === "active" ? "inactive" : "active",
    });
    ElMessage.success(`商品${action}成功`);
    loadProducts();
  } catch (error) {
    if (error !== "cancel") {
      console.error("切换商品状态失败:", error);
    }
  }
};

const deleteProduct = async (product) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除商品 "${product.name}" 吗？此操作不可恢复！`,
      "警告",
      {
        confirmButtonText: "确定删除",
        cancelButtonText: "取消",
        type: "error",
      }
    );

    await deleteProductApi(product.id);
    ElMessage.success("商品删除成功");
    loadProducts();
  } catch (error) {
    if (error !== "cancel") {
      console.error("删除商品失败:", error);
    }
  }
};

onMounted(async () => {
  await loadCategories();
  if (userStore.isAdmin) {
    await loadMerchants();
  }
  await loadProducts();
});
</script>

<style scoped>

.products {
  /* max-width: 1200px; */
  margin: 0 auto;
}

.products-header {
  margin-bottom: 30px;
}

.products-header h2 {
  color: #333;
  margin-bottom: 8px;
}

.products-header p {
  color: #666;
  font-size: 14px;
}

.action-bar {
  margin-bottom: 20px;
}

.search-bar {
  margin-bottom: 20px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>