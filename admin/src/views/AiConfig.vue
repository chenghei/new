<template>
  <div class="ai-config-page" v-loading="loading">
    <el-row :gutter="16">
      <el-col :xs="24" :md="15">
        <el-card class="config-card">
          <div class="card-head">
            <div>
              <div class="title">AI 服务配置</div>
              <div class="sub">配置大模型接口参数，保存后 AI 功能将优先使用此配置</div>
            </div>
          </div>

          <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" class="config-form">
            <el-form-item label="AI 服务开关">
              <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" inline-prompt />
              <span class="tip">停用后所有 AI 功能（推荐/对话/文案/分析）将不可用</span>
            </el-form-item>

            <el-form-item label="API 密钥" prop="api_key">
              <el-input
                v-model="form.api_key"
                type="password"
                show-password
                :placeholder="config.api_key_masked ? `当前密钥：${config.api_key_masked}（留空则不修改）` : '请输入 API 密钥'"
              />
              <div class="tip">
                <el-tag :type="keySourceTag" size="small" effect="plain">密钥来源：{{ keySourceText }}</el-tag>
                留空表示沿用当前密钥
              </div>
            </el-form-item>

            <el-form-item label="接口地址" prop="base_url">
              <el-input v-model="form.base_url" placeholder="https://api.deepseek.com" />
            </el-form-item>

            <el-form-item label="模型名称" prop="model">
              <el-select v-model="form.model" filterable allow-create style="width: 100%">
                <el-option label="deepseek-chat" value="deepseek-chat" />
                <el-option label="deepseek-reasoner" value="deepseek-reasoner" />
              </el-select>
            </el-form-item>

            <el-form-item label="采样温度">
              <el-slider v-model="form.temperature" :min="0" :max="2" :step="0.1" show-input />
              <div class="tip">值越高输出越发散，值越低越稳定（推荐 0.7）</div>
            </el-form-item>

            <el-form-item label="最大生成 Tokens">
              <el-input-number v-model="form.max_tokens" :min="100" :max="8000" :step="100" />
              <div class="tip">单次请求模型最多生成的 token 数</div>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
              <el-button :loading="testing" @click="handleTest">
                <el-icon><Connection /></el-icon> 测试连接
              </el-button>
            </el-form-item>
          </el-form>

          <el-alert
            v-if="testResult"
            :type="testResult.ok ? 'success' : 'error'"
            :closable="true"
            show-icon
            class="test-alert"
            :title="testResult.title"
            @close="testResult = null"
          />
        </el-card>
      </el-col>

      <el-col :xs="24" :md="9">
        <el-card class="help-card">
          <div class="card-head"><span class="title">配置说明</span></div>
          <ul class="help-list">
            <li>
              <strong>API 密钥</strong>
              在 DeepSeek 开放平台创建，形如 <code>sk-xxxxxxxx</code>。保存后写入数据库（脱敏存储展示），
              未配置时回退使用服务端 .env 的 <code>DEEPSEEK_API_KEY</code>。
            </li>
            <li>
              <strong>接口地址</strong>
              兼容 OpenAI 协议的服务地址，默认 <code>https://api.deepseek.com</code>。
            </li>
            <li>
              <strong>模型名称</strong>
              常用 <code>deepseek-chat</code>（通用对话）与 <code>deepseek-reasoner</code>（深度推理）。
            </li>
            <li>
              <strong>调用记录</strong>
              每次 AI 调用都会记录到「AI调用记录」，可在其中查看耗时、状态与生成内容。
            </li>
          </ul>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getAiConfig, updateAiConfig, testAiConfig } from '@/api/ai'

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const formRef = ref()
const config = ref({})
const testResult = ref(null)

const form = reactive({
  enabled: true,
  api_key: '',
  base_url: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  temperature: 0.7,
  max_tokens: 2000
})

const rules = {
  base_url: [{ required: true, message: '请输入接口地址', trigger: 'blur' }],
  model: [{ required: true, message: '请输入模型名称', trigger: 'blur' }]
}

const keySourceText = computed(() => {
  const map = { database: '数据库配置', env: '环境变量', none: '未配置' }
  return map[config.value.key_source] || '未配置'
})

const keySourceTag = computed(() => {
  const map = { database: 'success', env: 'warning', none: 'danger' }
  return map[config.value.key_source] || 'info'
})

const loadConfig = async () => {
  loading.value = true
  try {
    const res = await getAiConfig()
    config.value = res.data || {}
    form.enabled = config.value.enabled !== false
    form.base_url = config.value.base_url || 'https://api.deepseek.com'
    form.model = config.value.model || 'deepseek-chat'
    form.temperature = config.value.temperature != null ? config.value.temperature : 0.7
    form.max_tokens = config.value.max_tokens || 2000
    form.api_key = ''
  } catch (error) {
    /* 已提示 */
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    await updateAiConfig({
      enabled: form.enabled,
      api_key: form.api_key, // 为空则不修改
      base_url: form.base_url,
      model: form.model,
      temperature: form.temperature,
      max_tokens: form.max_tokens
    })
    ElMessage.success('AI 服务配置已保存')
    form.api_key = ''
    await loadConfig()
  } catch (error) {
    /* 已提示 */
  } finally {
    saving.value = false
  }
}

const handleTest = async () => {
  testing.value = true
  testResult.value = null
  try {
    const res = await testAiConfig({
      api_key: form.api_key,
      base_url: form.base_url,
      model: form.model,
      temperature: form.temperature,
      max_tokens: form.max_tokens
    })
    testResult.value = {
      ok: true,
      title: `连接成功（${res.data.model}，耗时 ${res.data.duration}ms）：${res.data.reply}`
    }
  } catch (error) {
    testResult.value = { ok: false, title: '连接失败，请检查密钥与接口地址是否正确' }
  } finally {
    testing.value = false
  }
}

onMounted(loadConfig)
</script>

<style scoped>
.config-card,
.help-card {
  border-radius: var(--radius);
  border: none;
  box-shadow: var(--shadow-card);
}

.card-head {
  margin-bottom: 20px;
}

.card-head .title {
  font-size: 16px;
  font-weight: 700;
}

.card-head .sub {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}

.config-form {
  max-width: 620px;
}

.tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.test-alert {
  margin-top: 8px;
}

.help-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.help-list li {
  font-size: 13px;
  color: var(--text-regular);
  line-height: 1.9;
}

.help-list strong {
  display: block;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.help-list code {
  padding: 1px 6px;
  border-radius: 4px;
  background: #f2f3f5;
  font-size: 12px;
  color: var(--brand);
}
</style>
