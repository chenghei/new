<template>
  <Layout>
    <div class="cart">
      <div class="cart-header">
        <h2>购物车</h2>
        <p>管理您的购物车商品</p>
      </div>

      <el-card>
        <!-- 购物车列表 -->
        <el-table
          v-loading="loading"
          :data="cartList"
          style="width: 100%"
          v-if="cartList.length > 0"
        >
          <el-table-column label="商品图片" width="120">
            <template #default="{ row }">
              <el-image
                :src="row.product?.image"
                fit="cover"
                style="width: 80px; height: 80px"
              />
            </template>
          </el-table-column>
          <el-table-column label="商品名称" prop="product.name" />
          <el-table-column label="所属商家">
            <template #default="{ row }">
              {{ row.product?.merchant?.nickname || "-" }}
            </template>
          </el-table-column>
          <el-table-column label="单价" width="100">
            <template #default="{ row }"> ¥{{ row.product?.price }} </template>
          </el-table-column>
          <el-table-column label="数量" width="150">
            <template #default="{ row }">
              <el-input-number
                v-model="row.quantity"
                :min="1"
                :max="99"
                size="small"
                @change="(val) => handleQuantityChange(row.id, val)"
              />
            </template>
          </el-table-column>
          <el-table-column label="小计" width="100">
            <template #default="{ row }">
              ¥{{ (row.product?.price * row.quantity).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-space>
                <el-button
                  type="success"
                  size="small"
                  @click="handleOrder(row)"
                >
                  下单
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  @click="handleDelete(row)"
                >
                  删除
                </el-button>
              </el-space>
            </template>
          </el-table-column>
        </el-table>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <el-empty description="购物车是空的">
            <el-button type="primary" @click="goToShop">去购物</el-button>
          </el-empty>
        </div>

        <!-- 底部操作栏 -->
        <div class="cart-footer" v-if="cartList.length > 0">
          <div class="total-info">
            <span>共 {{ cartList.length }} 件商品</span>
            <span class="total-price">总计: ¥{{ totalPrice }}</span>
          </div>
          <div class="actions">
            <el-button type="danger" @click="handleClearCart"
              >清空购物车</el-button
            >
            <el-button type="primary" @click="handleOrderAll"
              >全部下单</el-button
            >
          </div>
        </div>
      </el-card>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getCartList,
  updateCartQuantity,
  deleteCartItem,
  clearCart,
} from "@/api/cart";
import { createOrder } from "@/api/order";
import Layout from "@/components/Layout.vue";

const router = useRouter();
const loading = ref(false);
const cartList = ref([]);

// 计算总价
const totalPrice = computed(() => {
  return cartList.value
    .reduce((total, item) => {
      return total + (item.product?.price || 0) * item.quantity;
    }, 0)
    .toFixed(2);
});

// 加载购物车列表
const loadCartList = async () => {
  loading.value = true;
  try {
    const response = await getCartList();
    cartList.value = response.data;
  } catch (error) {
    console.error("加载购物车列表失败:", error);
    ElMessage.error("加载购物车列表失败");
  } finally {
    loading.value = false;
  }
};

// 处理数量变化
const handleQuantityChange = async (id, quantity) => {
  try {
    await updateCartQuantity(id, quantity);
    ElMessage.success("商品数量已更新");
  } catch (error) {
    console.error("更新商品数量失败:", error);
    ElMessage.error("更新商品数量失败");
    // 重新加载列表以恢复正确的数量
    loadCartList();
  }
};

// 删除商品
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除商品 "${row.product?.name}" 吗？`,
      "提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }
    );
    await deleteCartItem(row.id);
    ElMessage.success("商品已删除");
    loadCartList();
  } catch (error) {
    if (error !== "cancel") {
      console.error("删除商品失败:", error);
      ElMessage.error("删除商品失败");
    }
  }
};

// 清空购物车
const handleClearCart = async () => {
  try {
    await ElMessageBox.confirm("确定要清空购物车吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
    await clearCart();
    ElMessage.success("购物车已清空");
    loadCartList();
  } catch (error) {
    if (error !== "cancel") {
      console.error("清空购物车失败:", error);
      ElMessage.error("清空购物车失败");
    }
  }
};

// 下单单个商品
const handleOrder = async (row) => {
  try {
    await createOrder({
      product_id: row.product_id,
      quantity: row.quantity,
    });
    ElMessage.success(`商品 ${row.product?.name} 下单成功`);
    // 删除购物车中的该商品
    await deleteCartItem(row.id);
    loadCartList();
    // 跳转到订单页面
    router.push("/orders");
  } catch (error) {
    console.error("下单失败:", error);
    ElMessage.error("下单失败");
  }
};

// 全部下单
const handleOrderAll = async () => {
  try {
    // 逐个创建订单
    for (const item of cartList.value) {
      await createOrder({
        product_id: item.product_id,
        quantity: item.quantity,
      });
    }
    ElMessage.success("所有商品下单成功");
    // 清空购物车
    await clearCart();
    loadCartList();
    // 跳转到订单页面
    router.push("/orders");
  } catch (error) {
    console.error("下单失败:", error);
    ElMessage.error("下单失败");
  }
};

// 去购物
const goToShop = () => {
  router.push("/shop");
};

onMounted(() => {
  loadCartList();
});
</script>

<style scoped>
.cart {
  padding: 20px;
}

.cart-header {
  margin-bottom: 30px;
}

.cart-header h2 {
  color: #333;
  margin-bottom: 8px;
}

.cart-header p {
  color: #666;
  font-size: 14px;
}

.empty-state {
  padding: 60px 0;
  text-align: center;
}

.cart-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

.total-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.total-price {
  font-size: 20px;
  font-weight: bold;
  color: #f56c6c;
}

.actions {
  display: flex;
  gap: 10px;
}
</style>
