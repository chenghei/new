<template>
  <div class="merchants-page">
    <!-- 概览 -->
    <div class="stat-grid">
      <div class="stat-card" v-for="item in statCards" :key="item.label">
        <div class="stat-icon" :style="{ background: item.bg, color: item.color }">
          <el-icon size="20"><component :is="item.icon" /></el-icon>
        </div>
        <div>
          <p class="stat-value">{{ item.value }}</p>
          <p class="stat-label">{{ item.label }}</p>
        </div>
      </div>
    </div>

    <el-card class="table-card">
      <el-tabs v-model="activeTab">
        <!-- 入驻申请审核 -->
        <el-tab-pane label="入驻 / 资质审核" name="audit">
          <div class="toolbar">
            <div class="filters">
              <el-select v-model="shopStatus" style="width: 160px" @change="loadShops">
                <el-option label="待审核" value="pending" />
                <el-option label="已通过" value="approved" />
                <el-option label="已拒绝" value="rejected" />
                <el-option label="全部" value="" />
              </el-select>
              <el-button @click="loadShops">刷新</el-button>
            </div>
          </div>

          <el-table :data="shops" v-loading="shopLoading" stripe>
            <el-table-column label="店铺" min-width="200">
              <template #default="{ row }">
                <div class="shop-cell">
                  <el-avatar :size="40" shape="square" :src="resolveImage(row.logo)">
                    <el-icon><Shop /></el-icon>
                  </el-avatar>
                  <div>
                    <p class="name">{{ row.shop_name }}</p>
                    <p class="sub-text">{{ row.business_category || '未填写类目' }}</p>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="申请人" width="150">
              <template #default="{ row }">
                <div>{{ row.user?.nickname || row.user?.username || '-' }}</div>
                <div class="sub-text">{{ row.user?.email || '' }}</div>
              </template>
            </el-table-column>
            <el-table-column label="联系人" width="150">
              <template #default="{ row }">
                <div>{{ row.contact_name || '-' }}</div>
                <div class="sub-text">{{ row.contact_phone || '' }}</div>
              </template>
            </el-table-column>
            <el-table-column label="营业执照号" width="170">
              <template #default="{ row }">{{ row.business_license || '-' }}</template>
            </el-table-column>
            <el-table-column label="资质证件" width="90">
              <template #default="{ row }">
                <el-image
                  v-if="row.license_image"
                  :src="resolveImage(row.license_image)"
                  fit="cover"
                  class="license-thumb"
                  :preview-src-list="[resolveImage(row.license_image)]"
                  preview-teleported
                />
                <span v-else class="sub-text">未上传</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getShopStatus(row.status).tag" effect="light">
                  {{ getShopStatus(row.status).text }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="提交时间" width="170">
              <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.status === 'pending'" link type="primary" @click="openAudit(row)">
                  审核
                </el-button>
                <el-button link type="primary" @click="openAudit(row, true)">查看资质</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无入驻申请" :image-size="90" />
            </template>
          </el-table>
        </el-tab-pane>

        <!-- 商家列表 -->
        <el-tab-pane label="商家列表" name="list">
          <div class="toolbar">
            <div class="filters">
              <el-input
                v-model="merchantFilters.keyword"
                placeholder="搜索商家账号 / 昵称 / 邮箱"
                clearable
                style="width: 240px"
                @keyup.enter="handleMerchantSearch"
                @clear="handleMerchantSearch"
              >
                <template #prefix><el-icon><Search /></el-icon></template>
              </el-input>
              <el-select
                v-model="merchantFilters.shop_status"
                placeholder="店铺状态"
                clearable
                style="width: 150px"
                @change="handleMerchantSearch"
              >
                <el-option label="已通过" value="approved" />
                <el-option label="待审核" value="pending" />
                <el-option label="已拒绝" value="rejected" />
              </el-select>
              <el-select
                v-model="merchantFilters.status"
                placeholder="账号状态"
                clearable
                style="width: 150px"
                @change="handleMerchantSearch"
              >
                <el-option label="正常" value="active" />
                <el-option label="已禁用" value="inactive" />
              </el-select>
              <el-button type="primary" @click="handleMerchantSearch">查询</el-button>
            </div>
          </div>

          <el-table :data="merchants" v-loading="merchantLoading" stripe>
            <el-table-column label="店铺" min-width="190">
              <template #default="{ row }">
                <div class="shop-cell">
                  <el-avatar :size="40" shape="square" :src="resolveImage(row.shop?.logo)">
                    <el-icon><Shop /></el-icon>
                  </el-avatar>
                  <div>
                    <p class="name">{{ row.shop?.shop_name || '未创建店铺' }}</p>
                    <p class="sub-text">{{ row.shop?.business_category || '-' }}</p>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="商家账号" min-width="160">
              <template #default="{ row }">
                <div>{{ row.nickname || row.username }}</div>
                <div class="sub-text">{{ row.email }}</div>
              </template>
            </el-table-column>
            <el-table-column label="联系方式" width="150">
              <template #default="{ row }">
                <div>{{ row.shop?.contact_name || '-' }}</div>
                <div class="sub-text">{{ row.shop?.contact_phone || row.phone || '' }}</div>
              </template>
            </el-table-column>
            <el-table-column label="店铺状态" width="110">
              <template #default="{ row }">
                <el-tag :type="getShopStatus(row.shop?.status).tag" effect="light">
                  {{ getShopStatus(row.shop?.status).text }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="账号状态" width="110">
              <template #default="{ row }">
                <el-switch
                  :model-value="row.status === 'active'"
                  :loading="row._loading"
                  @change="(val) => toggleMerchant(row, val)"
                />
              </template>
            </el-table-column>
            <el-table-column label="入驻时间" width="170">
              <template #default="{ row }">{{ formatDateTime(row.shop?.created_at || row.created_at) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="110" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openAudit(row.shop, true)">查看店铺</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无商家" :image-size="90" />
            </template>
          </el-table>

          <div class="pagination">
            <el-pagination
              v-model:current-page="merchantPagination.page"
              v-model:page-size="merchantPagination.limit"
              :page-sizes="[10, 20, 50]"
              :total="merchantPagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @size-change="handleMerchantSizeChange"
              @current-change="loadMerchants"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 店铺资质 / 审核 -->
    <el-dialog v-model="auditVisible" :title="auditReadonly ? '店铺资质信息' : '店铺入驻审核'" width="620px">
      <template v-if="currentShop">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="店铺名称">{{ currentShop.shop_name }}</el-descriptions-item>
          <el-descriptions-item label="经营类目">{{ currentShop.business_category || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ currentShop.contact_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentShop.contact_phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="营业执照号" :span="2">
            {{ currentShop.business_license || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="店铺地址" :span="2">{{ currentShop.address || '-' }}</el-descriptions-item>
          <el-descriptions-item label="店铺简介" :span="2">{{ currentShop.description || '-' }}</el-descriptions-item>
          <el-descriptions-item label="审核状态">
            <el-tag :type="getShopStatus(currentShop.status).tag" effect="light">
              {{ getShopStatus(currentShop.status).text }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ formatDateTime(currentShop.created_at) }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="currentShop.reject_reason" class="reject-reason">
          <el-alert type="error" :closable="false" show-icon :title="`拒绝原因：${currentShop.reject_reason}`" />
        </div>

        <div class="qualification">
          <div class="qual-item">
            <span class="qual-label">店铺Logo</span>
            <el-image
              v-if="currentShop.logo"
              :src="resolveImage(currentShop.logo)"
              fit="cover"
              class="qual-img"
              :preview-src-list="[resolveImage(currentShop.logo)]"
              preview-teleported
            />
            <span v-else class="sub-text">未上传</span>
          </div>
          <div class="qual-item">
            <span class="qual-label">资质证件</span>
            <el-image
              v-if="currentShop.license_image"
              :src="resolveImage(currentShop.license_image)"
              fit="cover"
              class="qual-img"
              :preview-src-list="[resolveImage(currentShop.license_image)]"
              preview-teleported
            />
            <span v-else class="sub-text">未上传</span>
          </div>
        </div>

        <el-form v-if="!auditReadonly" :model="auditForm" label-width="80px" class="audit-form">
          <el-form-item label="审核结果">
            <el-radio-group v-model="auditForm.status">
              <el-radio label="approved">通过</el-radio>
              <el-radio label="rejected">拒绝</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="auditForm.status === 'rejected'" label="拒绝原因">
            <el-input
              v-model="auditForm.reject_reason"
              type="textarea"
              :rows="3"
              maxlength="200"
              show-word-limit
              placeholder="请填写拒绝原因，商家可据此修改后重新提交"
            />
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="auditVisible = false">关闭</el-button>
        <el-button v-if="!auditReadonly" type="primary" :loading="auditing" @click="submitAudit">
          提交审核
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMerchants, setMerchantStatus, getShops, auditShop } from '@/api/merchant'
import { resolveImage, formatDateTime, getShopStatus } from '@/utils/format'

const activeTab = ref('audit')

// 概览
const merchantStats = ref({})

// 入驻审核
const shops = ref([])
const shopLoading = ref(false)
const shopStatus = ref('pending')

// 商家列表
const merchants = ref([])
const merchantLoading = ref(false)
const merchantFilters = reactive({ keyword: '', status: '', shop_status: '' })
const merchantPagination = reactive({ page: 1, limit: 10, total: 0 })

// 审核弹窗
const auditVisible = ref(false)
const auditReadonly = ref(false)
const currentShop = ref(null)
const auditing = ref(false)
const auditForm = reactive({ status: 'approved', reject_reason: '' })

const statCards = computed(() => {
  const s = merchantStats.value
  return [
    { label: '商家总数', value: s.total ?? 0, icon: 'Shop', bg: '#fff1ec', color: '#ff4d21' },
    { label: '已通过', value: s.approved ?? 0, icon: 'CircleCheck', bg: '#e8f8f2', color: '#00a870' },
    { label: '待审核', value: s.pending ?? 0, icon: 'Clock', bg: '#fff7e6', color: '#ff8f1f' },
    { label: '已拒绝', value: s.rejected ?? 0, icon: 'CircleClose', bg: '#fff0f3', color: '#ff2c55' },
    { label: '已禁用账号', value: s.disabled ?? 0, icon: 'Lock', bg: '#f2f3f5', color: '#86909c' }
  ]
})

const loadShops = async () => {
  shopLoading.value = true
  try {
    const params = {}
    if (shopStatus.value) params.status = shopStatus.value
    const res = await getShops(params)
    shops.value = res.data || []
  } catch (error) {
    shops.value = []
  } finally {
    shopLoading.value = false
  }
}

const loadMerchants = async () => {
  merchantLoading.value = true
  try {
    const params = { page: merchantPagination.page, limit: merchantPagination.limit }
    if (merchantFilters.keyword) params.keyword = merchantFilters.keyword
    if (merchantFilters.status) params.status = merchantFilters.status
    if (merchantFilters.shop_status) params.shop_status = merchantFilters.shop_status

    const res = await getMerchants(params)
    merchants.value = (res.data.merchants || []).map((m) => ({ ...m, _loading: false }))
    merchantPagination.total = res.data.pagination?.total || 0
    merchantStats.value = res.data.stats || {}
  } catch (error) {
    merchants.value = []
  } finally {
    merchantLoading.value = false
  }
}

const handleMerchantSearch = () => {
  merchantPagination.page = 1
  loadMerchants()
}

const handleMerchantSizeChange = (size) => {
  merchantPagination.limit = size
  merchantPagination.page = 1
  loadMerchants()
}

const toggleMerchant = async (row, val) => {
  try {
    await ElMessageBox.confirm(
      `确定要${val ? '启用' : '禁用'}商家「${row.shop?.shop_name || row.username}」的账号吗？`,
      '商家状态管理',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  row._loading = true
  try {
    await setMerchantStatus(row.id, val ? 'active' : 'inactive')
    row.status = val ? 'active' : 'inactive'
    ElMessage.success(val ? '商家账号已启用' : '商家账号已禁用')
    loadMerchants()
  } catch (error) {
    /* 已提示 */
  } finally {
    row._loading = false
  }
}

const openAudit = (shop, readonly = false) => {
  if (!shop) return
  currentShop.value = shop
  auditReadonly.value = readonly || shop.status !== 'pending'
  auditForm.status = 'approved'
  auditForm.reject_reason = ''
  auditVisible.value = true
}

const submitAudit = async () => {
  if (auditForm.status === 'rejected' && !auditForm.reject_reason.trim()) {
    ElMessage.warning('请填写拒绝原因')
    return
  }
  auditing.value = true
  try {
    await auditShop(currentShop.value.id, {
      status: auditForm.status,
      reject_reason: auditForm.reject_reason
    })
    ElMessage.success(auditForm.status === 'approved' ? '已通过商家入驻审核' : '已拒绝该入驻申请')
    auditVisible.value = false
    loadShops()
    loadMerchants()
  } catch (error) {
    /* 已提示 */
  } finally {
    auditing.value = false
  }
}

onMounted(() => {
  loadShops()
  loadMerchants()
})
</script>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: var(--shadow-card);
}

.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-value {
  font-size: 20px;
  font-weight: 800;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.table-card {
  border-radius: var(--radius);
  border: none;
  box-shadow: var(--shadow-card);
}

.shop-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.shop-cell .name {
  font-size: 14px;
  color: var(--text-primary);
}

.license-thumb {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  cursor: pointer;
}

.reject-reason {
  margin-top: 14px;
}

.qualification {
  display: flex;
  gap: 40px;
  margin-top: 18px;
}

.qual-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.qual-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.qual-img {
  width: 110px;
  height: 110px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.audit-form {
  margin-top: 18px;
}

@media (max-width: 1200px) {
  .stat-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
