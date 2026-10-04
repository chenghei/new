<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" class="shop-form">
    <el-row :gutter="20">
      <el-col :xs="24" :sm="12">
        <el-form-item label="店铺名称" prop="shop_name">
          <el-input v-model="form.shop_name" placeholder="请输入店铺名称" maxlength="100" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-form-item label="经营类目" prop="category_id">
          <el-select
            v-model="form.category_id"
            placeholder="请选择经营类目"
            style="width: 100%"
            :disabled="categoryDisabled"
            @change="handleCategoryChange"
          >
            <el-option
              v-for="c in categories"
              :key="c.id"
              :label="c.name"
              :value="c.id"
              :disabled="c.status !== 'active'"
            />
          </el-select>
          <div class="form-tip">
            {{ categoryDisabled ? '经营类目在入驻时确定，不可修改' : '经营类目来自平台「分类管理」，商品分类将默认使用该分类' }}
          </div>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-form-item label="联系人" prop="contact_name">
          <el-input v-model="form.contact_name" placeholder="请输入联系人姓名" maxlength="50" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-form-item label="联系电话" prop="contact_phone">
          <el-input v-model="form.contact_phone" placeholder="请输入联系电话" maxlength="20" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-form-item label="营业执照号" prop="business_license">
          <el-input v-model="form.business_license" placeholder="请输入营业执照编号" maxlength="100" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-form-item label="店铺地址" prop="address">
          <el-input v-model="form.address" placeholder="请输入店铺经营地址" maxlength="255" />
        </el-form-item>
      </el-col>
      <el-col :span="24">
        <el-form-item label="店铺简介" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            maxlength="200"
            show-word-limit
            placeholder="简单介绍一下你的店铺"
          />
        </el-form-item>
      </el-col>

      <el-col :xs="24" :sm="12">
        <el-form-item label="店铺Logo">
          <div class="uploader">
            <el-avatar :size="60" shape="square" :src="resolveImage(form.logo)">
              <el-icon><Picture /></el-icon>
            </el-avatar>
            <el-upload :show-file-list="false" :http-request="(o) => handleUpload(o, 'logo')" accept="image/*">
              <el-button size="small">上传Logo</el-button>
            </el-upload>
          </div>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-form-item label="资质证件">
          <div class="uploader">
            <el-avatar :size="60" shape="square" :src="resolveImage(form.license_image)">
              <el-icon><Document /></el-icon>
            </el-avatar>
            <el-upload
              :show-file-list="false"
              :http-request="(o) => handleUpload(o, 'license_image')"
              accept="image/*"
            >
              <el-button size="small">上传证件</el-button>
            </el-upload>
          </div>
        </el-form-item>
      </el-col>
    </el-row>

    <el-form-item>
      <el-button type="primary" :loading="loading" @click="handleSubmit">{{ submitText }}</el-button>
      <slot name="extra"></slot>
    </el-form-item>
  </el-form>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadImg } from '@/api/product'
import { getCategories } from '@/api/category'
import { resolveImage } from '@/utils/format'

const props = defineProps({
  form: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  submitText: { type: String, default: '保存' },
  // 店铺管理场景下经营类目已锁定，不允许修改
  categoryDisabled: { type: Boolean, default: false }
})

const emit = defineEmits(['submit'])

const formRef = ref()
const categories = ref([])

// 经营类目选项来自管理员维护的商品分类
const loadCategories = async () => {
  try {
    const res = await getCategories()
    categories.value = res.data.users || []
  } catch (error) {
    categories.value = []
  }
}

// 选中分类后同步分类名称，便于列表/详情处展示
const handleCategoryChange = (id) => {
  const target = categories.value.find((c) => c.id === id)
  props.form.business_category = target ? target.name : ''
}

onMounted(loadCategories)

const rules = computed(() => ({
  shop_name: [
    { required: true, message: '请输入店铺名称', trigger: 'blur' },
    { min: 2, max: 100, message: '店铺名称长度为2-100个字符', trigger: 'blur' }
  ],
  category_id: [
    {
      // 必填标记：入驻时显示 *；店铺管理中类目已锁定则不显示
      required: !props.categoryDisabled,
      validator: (rule, value, callback) => {
        // 店铺管理中被锁定，不做必填校验（避免历史无类目数据无法保存）
        if (props.categoryDisabled) return callback()
        if (value === null || value === undefined || value === '') {
          return callback(new Error('请选择经营类目'))
        }
        callback()
      },
      trigger: 'change'
    }
  ],
  contact_name: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  contact_phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$|^0\d{2,3}-?\d{7,8}$/, message: '请输入正确的联系电话', trigger: 'blur' }
  ]
}))

const handleUpload = async ({ file }, field) => {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await uploadImg(formData)
    props.form[field] = res.data
    ElMessage.success('上传成功')
  } catch (error) {
    /* 已提示 */
  }
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  emit('submit')
}
</script>

<style scoped>
.shop-form {
  max-width: 860px;
}

.uploader {
  display: flex;
  align-items: center;
  gap: 14px;
}

.form-tip {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}
</style>
