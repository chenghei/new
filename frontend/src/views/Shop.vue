<template>
  <Layout>
    <div class="shop">
      <div class="shop-header">
        <h2>商品列表</h2>
        <p>浏览和购买商品</p>
      </div>

      <el-card>
        <!-- 分类标签页 -->
        <div class="category-tabs">
          <el-tabs v-model="activeCategoryId" @tab-click="handleTabClick">
            <el-tab-pane label="全部" name="" />
            <el-tab-pane
              v-for="(item, index) in categories"
              :key="index"
              :label="item.name"
              :name="String(item.id)"
            />
          </el-tabs>
        </div>

        <!-- 商品列表 -->
        <div class="products-grid">
          <el-card
            v-for="product in products"
            :key="product.id"
            class="product-card"
          >
            <template #header>
              <div class="product-header">
                <h3>{{ product.name }}</h3>
                <span class="product-price">¥{{ product.price }}</span>
              </div>
            </template>
            <div class="product-body">
              <el-image
                :src="product.image"
                fit="cover"
                class="product-image"
              />
              <div class="product-info">
                <p class="merchant">
                  所属商家：{{ product.merchant?.nickname || "-" }}
                </p>
              </div>
              <div class="product-actions">
                <el-button type="primary" @click="addToCart(product)">
                  <el-icon><ShoppingCart /></el-icon>
                  加入购物车
                </el-button>
                <el-button type="success" @click="buyNow(product)">
                  <el-icon><Star /></el-icon>
                  立即购买
                </el-button>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 空状态 -->
        <div v-if="products.length === 0" class="empty-state">
          <el-empty description="暂无商品" />
        </div>

        <!-- 分页 -->
        <div class="pagination" v-if="products.length > 0">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :page-sizes="[12, 24, 36]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handlePageSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </el-card>
    </div>
  </Layout>
</template>

<script setup>
import { reactive, ref, onMounted, nextTick } from "vue";
import { ElMessage } from "element-plus";
import { useUserStore } from "@/store/user";
import { getProducts } from "@/api/product";
import { getCategories } from "@/api/category";
import { addToCart as addToCartApi } from "@/api/cart";
import { createOrder } from "@/api/order";
import { useRouter } from "vue-router";
import Layout from "@/components/Layout.vue";

const userStore = useUserStore();
const router = useRouter();

const categories = ref([]);
const products = ref([]);
const activeCategoryId = ref("");

const pagination = reactive({
  page: 1,
  limit: 12,
  total: 0,
});

// 加载分类列表
const loadCategories = async () => {
  try {
    const response = await getCategories();
    categories.value = response.data.users;
  } catch (error) {
    console.error("加载分类失败:", error);
    ElMessage.error("加载分类列表失败");
  }
};

// 加载商品列表
const loadProducts = async () => {
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      sortBy: "created_at",
      order: "desc",
      category_id: activeCategoryId.value,
    };

    const response = await getProducts(params);
    const { products: productList, pagination: paginationData } = response.data;

    products.value = productList.filter((e) => e.status === "active");
    pagination.total = paginationData.total;
  } catch (error) {
    console.error("加载商品列表失败:", error);
    ElMessage.error("加载商品列表失败");
  }
};

// 处理tab点击
const handleTabClick = () => {
  pagination.page = 1;
  nextTick(() => {
    loadProducts();
  });
};

// 处理分页变化
const handlePageChange = (page) => {
  pagination.page = page;
  loadProducts();
};

// 处理每页大小变化
const handlePageSizeChange = (size) => {
  pagination.limit = size;
  pagination.page = 1;
  loadProducts();
};

// 加入购物车
const addToCart = async (product) => {
  try {
    await addToCartApi({
      product_id: product.id,
      quantity: 1,
    });
    ElMessage.success(`商品 ${product.name} 已加入购物车`);
  } catch (error) {
    console.error("加入购物车失败:", error);
    ElMessage.error("加入购物车失败");
  }
};

// 立即购买
const buyNow = async (product) => {
  try {
    await createOrder({
      product_id: product.id,
      quantity: 1,
    });
    ElMessage.success(`商品 ${product.name} 下单成功`);
    // 跳转到订单页面
    router.push("/orders");
  } catch (error) {
    console.error("下单失败:", error);
    ElMessage.error("下单失败");
  }
};

onMounted(async () => {
  await loadCategories();
  await loadProducts();
});
</script>

<style scoped>
.shop {
  padding: 20px;
}

.shop-header {
  margin-bottom: 30px;
}

.shop-header h2 {
  color: #333;
  margin-bottom: 8px;
}

.shop-header p {
  color: #666;
  font-size: 14px;
}

.category-tabs {
  margin-bottom: 30px;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.product-card {
  transition: transform 0.3s ease;
}

.product-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap; /* 防止文本换行 */
  overflow: hidden; /* 隐藏超出容器的内容 */
  text-overflow: ellipsis;
}

.product-price {
  font-size: 18px;
  font-weight: bold;
  color: #f56c6c;
}

.product-body {
  padding: 10px 0;
}

.product-image {
  width: 100%;
  height: 200px;
  margin-bottom: 15px;
}

.product-info {
  margin-bottom: 15px;
}

.merchant {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.product-actions {
  display: flex;
  gap: 10px;
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
</style>