<template>
  <Layout>
    <div class="orders">
      <div class="orders-header">
        <h2>我的订单</h2>
        <p>查看和管理您的订单</p>
      </div>

      <el-card>
        <!-- 状态筛选 -->
        <div class="filter-bar">
          <el-radio-group v-model="filterStatus" @change="handleFilterChange">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button value="ongoing">进行中</el-radio-button>
            <el-radio-button value="completed">已完成</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 订单列表 -->
        <el-table
          v-loading="loading"
          :data="orders"
          style="width: 100%"
          v-if="orders.length > 0"
        >
          <el-table-column label="订单号" prop="order_no" width="150" />
          <el-table-column label="商品图片" width="100">
            <template #default="{ row }">
              <el-image
                :src="row.product?.image"
                fit="cover"
                style="width: 60px; height: 60px"
              />
            </template>
          </el-table-column>
          <el-table-column label="商品名称" prop="product.name" />
          <el-table-column label="购买用户" width="120">
            <template #default="{ row }">
              {{ row.user?.nickname || row.user?.username || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="所属商家">
            <template #default="{ row }">
              {{ row.product?.merchant?.nickname || "-" }}
            </template>
          </el-table-column>
          <el-table-column label="商品价格" width="100">
            <template #default="{ row }">
              ¥{{ row.product?.price }}
            </template>
          </el-table-column>
          <el-table-column label="数量" prop="quantity" width="80" />
          <el-table-column label="总价" width="100">
            <template #default="{ row }">
              ¥{{ row.total_price }}
            </template>
          </el-table-column>
          <el-table-column label="下单时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="订单状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button 
                v-if="canEditOrder(row)"
                type="primary" 
                size="small" 
                @click="handleEdit(row)"
              >
                编辑
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <el-empty description="暂无订单">
            <el-button type="primary" @click="goToShop">去购物</el-button>
          </el-empty>
        </div>

        <!-- 分页 -->
        <div class="pagination" v-if="orders.length > 0">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :page-sizes="[10, 20, 50]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handlePageSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </el-card>

      <!-- 编辑订单对话框 -->
      <el-dialog
        v-model="dialogVisible"
        title="编辑订单状态"
        width="400px"
      >
        <el-form :model="editForm" label-width="100px">
          <el-form-item label="订单状态">
            <el-select v-model="editForm.status" style="width: 100%">
              <el-option label="进行中" value="ongoing" />
              <el-option label="已完成" value="completed" />
            </el-select>
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
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getOrders, updateOrderStatus } from '@/api/order'
import { useUserStore } from '@/store/user'
import Layout from '@/components/Layout.vue'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const orders = ref([])
const filterStatus = ref('')
const dialogVisible = ref(false)
const currentOrderId = ref(null)

const editForm = reactive({
  status: ''
})

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString()
}

// 获取状态类型
const getStatusType = (status) => {
  const types = {
    ongoing: 'warning',
    completed: 'success'
  }
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const texts = {
    ongoing: '进行中',
    completed: '已完成'
  }
  return texts[status] || status
}

// 判断是否有权限编辑订单（只有管理员和商品所属商户可以编辑）
const canEditOrder = (row) => {
  const currentUser = userStore.user
  if (!currentUser) return false
  
  // 管理员可以编辑所有订单
  if (currentUser.role === 'admin') return true
  
  // 商户只能编辑自己商品的订单
  if (currentUser.role === 'merchant' && row.product && row.product.user_id === currentUser.id) {
    return true
  }
  
  return false
}

// 加载订单列表
const loadOrders = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit
    }
    if (filterStatus.value) {
      params.status = filterStatus.value
    }
    const response = await getOrders(params)
    orders.value = response.data.orders
    pagination.total = response.data.pagination.total
  } catch (error) {
    console.error('加载订单列表失败:', error)
    ElMessage.error('加载订单列表失败')
  } finally {
    loading.value = false
  }
}

// 处理筛选变化
const handleFilterChange = () => {
  pagination.page = 1
  loadOrders()
}

// 处理分页变化
const handlePageChange = (page) => {
  pagination.page = page
  loadOrders()
}

// 处理每页大小变化
const handlePageSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadOrders()
}

// 编辑订单
const handleEdit = (row) => {
  currentOrderId.value = row.id
  editForm.status = row.status
  dialogVisible.value = true
}

// 提交编辑
const handleSubmit = async () => {
  try {
    await updateOrderStatus(currentOrderId.value, {
      status: editForm.status
    })
    ElMessage.success('订单状态更新成功')
    dialogVisible.value = false
    loadOrders()
  } catch (error) {
    console.error('更新订单状态失败:', error)
    ElMessage.error('更新订单状态失败')
  }
}

// 去购物
const goToShop = () => {
  router.push('/shop')
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped>
.orders {
  padding: 20px;
}

.orders-header {
  margin-bottom: 30px;
}

.orders-header h2 {
  color: #333;
  margin-bottom: 8px;
}

.orders-header p {
  color: #666;
  font-size: 14px;
}

.filter-bar {
  margin-bottom: 20px;
}

.empty-state {
  padding: 60px 0;
  text-align: center;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
