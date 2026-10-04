<template>
  <div class="ai-copy-page">
    <el-row :gutter="16">
      <!-- 左侧：输入 -->
      <el-col :xs="24" :md="10">
        <el-card class="input-card">
          <div class="page-header">
            <div>
              <div class="title">AI 商品文案生成</div>
              <div class="sub">填写基础信息，AI 自动生成标题、卖点与详情描述</div>
            </div>
          </div>
          <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
            <el-form-item label="商品名称" prop="name">
              <el-input v-model="form.name" placeholder="如：无线蓝牙耳机" maxlength="100" />
            </el-form-item>
            <el-form-item label="商品分类" prop="category">
              <el-select v-model="form.category" placeholder="店铺经营类目" style="width: 100%" disabled>
                <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.name" />
              </el-select>
              <div class="form-tip">商品分类跟随店铺经营类目，不可修改</div>
            </el-form-item>
            <el-form-item label="商品特点" prop="features">
              <el-input
                v-model="form.features"
                type="textarea"
                :rows="6"
                maxlength="500"
                show-word-limit
                placeholder="描述商品的特点，如：主动降噪、续航30小时、佩戴舒适、支持无线充电、适合通勤和运动"
              />
            </el-form-item>
            <el-button type="primary" class="gen-btn" :loading="loading" @click="handleGenerate">
              <el-icon><MagicStick /></el-icon>
              {{ loading ? 'AI 生成中...' : '生成文案' }}
            </el-button>
          </el-form>

          <div class="tips">
            <p><el-icon><InfoFilled /></el-icon> 小提示</p>
            <ul>
              <li>特点越具体，生成的文案越贴合商品</li>
              <li>生成结果可复制，或一键填入商品发布表单</li>
            </ul>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：结果 -->
      <el-col :xs="24" :md="14">
        <el-card class="result-card">
          <div class="page-header">
            <div class="title">生成结果</div>
            <el-button v-if="result" text type="primary" @click="applyToProduct">一键填入商品发布</el-button>
          </div>

          <div v-if="!result && !loading" class="placeholder">
            <el-empty description="填写左侧信息后，点击「生成文案」" :image-size="110" />
          </div>

          <div v-loading="loading" class="result-body">
            <template v-if="result">
              <div class="result-block">
                <div class="block-head">
                  <span class="block-title">商品标题</span>
                  <el-button link type="primary" @click="copy(result.title)">
                    <el-icon><CopyDocument /></el-icon> 复制
                  </el-button>
                </div>
                <div class="title-text">{{ result.title }}</div>
              </div>

              <div class="result-block">
                <div class="block-head">
                  <span class="block-title">商品卖点</span>
                  <el-button link type="primary" @click="copy(result.selling_points.join('\n'))">
                    <el-icon><CopyDocument /></el-icon> 复制
                  </el-button>
                </div>
                <ul class="selling-list">
                  <li v-for="(point, index) in result.selling_points" :key="index">
                    <span class="dot">{{ index + 1 }}</span>{{ point }}
                  </li>
                </ul>
              </div>

              <div class="result-block">
                <div class="block-head">
                  <span class="block-title">商品描述</span>
                  <el-button link type="primary" @click="copy(result.description)">
                    <el-icon><CopyDocument /></el-icon> 复制
                  </el-button>
                </div>
                <div class="desc-text">{{ result.description }}</div>
              </div>
            </template>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { generateProductCopy } from '@/api/ai'
import { getCategories } from '@/api/category'
import { useShopStore } from '@/store/shop'

const router = useRouter()
const shopStore = useShopStore()

const formRef = ref()
const loading = ref(false)
const result = ref(null)
const categories = ref([])

const form = reactive({ name: '', category: '', features: '' })

const rules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }]
}

const loadCategories = async () => {
  try {
    const res = await getCategories()
    categories.value = (res.data.users || []).filter((c) => c.status === 'active')
  } catch (error) {
    categories.value = []
  }
}

const handleGenerate = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  result.value = null
  try {
    const res = await generateProductCopy({
      name: form.name,
      category: form.category,
      features: form.features
    })
    result.value = res.data
    ElMessage.success('文案生成成功')
  } catch (error) {
    /* 已提示 */
  } finally {
    loading.value = false
  }
}

const copy = async (text) => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    ElMessage.warning('复制失败，请手动选中复制')
  }
}

// 将生成的标题、卖点与描述存入草稿，跳转到商品管理自动打开新增弹窗
const applyToProduct = () => {
  if (!result.value) return
  sessionStorage.setItem(
    'ai_product_draft',
    JSON.stringify({
      title: result.value.title,
      selling_points: result.value.selling_points || [],
      description: result.value.description || ''
    })
  )
  ElMessage.success('已生成商品草稿，请完善分类、价格等信息后保存')
  router.push('/products')
}

onMounted(async () => {
  // 商品分类取自店铺经营类目，不可修改
  if (!shopStore.loaded) await shopStore.loadShop()
  form.category = shopStore.shop?.business_category || ''
  await loadCategories()
})
</script>

<style scoped>
.input-card,
.result-card {
  border-radius: var(--radius);
  border: none;
  box-shadow: var(--shadow-card);
  min-height: 520px;
}

.gen-btn {
  width: 100%;
  height: 42px;
  background: var(--brand-gradient);
  border: none;
}

.form-tip {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.tips {
  margin-top: 22px;
  padding: 14px 16px;
  border-radius: 10px;
  background: #f7f8fa;
  font-size: 13px;
  color: var(--text-secondary);
}

.tips p {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--text-regular);
  margin-bottom: 8px;
}

.tips ul {
  padding-left: 18px;
  line-height: 1.9;
}

.placeholder {
  padding: 40px 0;
}

.result-body {
  min-height: 200px;
}

.result-block {
  padding: 16px 0;
  border-bottom: 1px dashed var(--border-color);
}

.result-block:last-child {
  border-bottom: none;
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.block-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  position: relative;
  padding-left: 10px;
}

.block-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: var(--brand-gradient);
}

.title-text {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.6;
  background: var(--brand-light);
  border-radius: 10px;
  padding: 12px 16px;
}

.selling-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selling-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #f7f8fa;
  color: var(--text-regular);
}

.selling-list .dot {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--brand-gradient);
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.desc-text {
  color: var(--text-regular);
  line-height: 1.9;
  white-space: pre-wrap;
}
</style>
