<template>
  <Layout>
    <div class="dashboard">
      <div class="dashboard-header">
        <h2>商城日志</h2>
        <p>查看商城运营数据统计</p>
      </div>

      <!-- 统计卡片 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="8" :xs="24" :sm="12" :md="8">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-icon user-icon">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.totalUsers }}</div>
              <div class="stat-label">总用户数</div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="8" :xs="24" :sm="12" :md="8">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-icon order-completed-icon">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.totalCompletedOrders }}</div>
              <div class="stat-label">总完成订单数</div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="8" :xs="24" :sm="12" :md="8">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-icon order-ongoing-icon">
              <el-icon><Timer /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.totalOngoingOrders }}</div>
              <div class="stat-label">总未完成订单数</div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="8" :xs="24" :sm="12" :md="8">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-icon today-order-icon">
              <el-icon><ShoppingCart /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.todayOrders }}</div>
              <div class="stat-label">今日订单数</div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="8" :xs="24" :sm="12" :md="8">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-icon today-completed-icon">
              <el-icon><CircleCheckFilled /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.todayCompletedOrders }}</div>
              <div class="stat-label">今日已完成订单数</div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="8" :xs="24" :sm="12" :md="8">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-icon today-user-icon">
              <el-icon><UserFilled /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.todayNewUsers }}</div>
              <div class="stat-label">今日新增用户数</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 最近订单 -->
      <el-card class="recent-orders-card">
        <template #header>
          <div class="card-header">
            <span>最近订单</span>
            <el-button type="primary" link @click="goToOrders"
              >查看全部</el-button
            >
          </div>
        </template>

        <el-table :data="recentOrders" style="width: 100%">
          <el-table-column label="订单号" prop="order_no" width="150" />
          <el-table-column label="商品名称" prop="product.name" />
          <el-table-column label="所属商家" width="120">
            <template #default="{ row }">
              {{ row.product?.merchant?.nickname || row.product?.merchant?.username || "-" }}
            </template>
          </el-table-column>
          <el-table-column label="购买用户" width="120">
            <template #default="{ row }">
              {{ row.user?.nickname || "-" }}
            </template>
          </el-table-column>
          <el-table-column label="总价" width="100">
            <template #default="{ row }"> ¥{{ row.total_price }} </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="下单时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </Layout>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { getDashboardStats, getRecentOrders } from "@/api/dashboard";
import Layout from "@/components/Layout.vue";

const router = useRouter();

const stats = reactive({
  totalUsers: 0,
  totalOrders: 0,
  totalCompletedOrders: 0,
  totalOngoingOrders: 0,
  todayOrders: 0,
  todayCompletedOrders: 0,
  todayNewUsers: 0,
});

const recentOrders = ref([]);

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString();
};

// 获取状态类型
const getStatusType = (status) => {
  const types = {
    ongoing: "warning",
    completed: "success",
  };
  return types[status] || "info";
};

// 获取状态文本
const getStatusText = (status) => {
  const texts = {
    ongoing: "进行中",
    completed: "已完成",
  };
  return texts[status] || status;
};

// 加载统计数据
const loadStats = async () => {
  try {
    const response = await getDashboardStats();
    Object.assign(stats, response.data);
  } catch (error) {
    console.error("加载统计数据失败:", error);
    ElMessage.error("加载统计数据失败");
  }
};

// 加载最近订单
const loadRecentOrders = async () => {
  try {
    const response = await getRecentOrders({ limit: 10 });
    recentOrders.value = response.data;
  } catch (error) {
    console.error("加载最近订单失败:", error);
    ElMessage.error("加载最近订单失败");
  }
};

// 跳转到订单页面
const goToOrders = () => {
  router.push("/orders");
};

onMounted(() => {
  loadStats();
  loadRecentOrders();
});
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.dashboard-header {
  margin-bottom: 30px;
}

.dashboard-header h2 {
  color: #333;
  margin-bottom: 8px;
}

.dashboard-header p {
  color: #666;
  font-size: 14px;
}

.stats-row {
  margin-bottom: 30px;
}

.stat-card {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  margin-bottom: 20px;
  text-align: center;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}
:deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.user-icon {
  background-color: #e6f7ff;
  color: #1890ff;
}

.order-completed-icon {
  background-color: #f6ffed;
  color: #52c41a;
}

.order-ongoing-icon {
  background-color: #fff7e6;
  color: #fa8c16;
}

.today-order-icon {
  background-color: #f0f5ff;
  color: #2f54eb;
}

.today-completed-icon {
  background-color: #e6fffb;
  color: #13c2c2;
}

.today-user-icon {
  background-color: #fff0f6;
  color: #eb2f96;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.recent-orders-card {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
