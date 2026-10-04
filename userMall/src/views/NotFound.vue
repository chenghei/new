<template>
  <div class="not-found">
    <div class="code">404</div>
    <p class="text">抱歉，你访问的页面走丢了～</p>
    <div class="actions">
      <el-button type="primary" size="large" round @click="$router.push('/')">返回首页</el-button>
      <el-button size="large" round @click="$router.back()">返回上一页</el-button>
    </div>
  </div>
</template>

<script setup></script>

<style scoped>
.not-found {
  min-height: 70vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.code {
  font-size: 120px;
  font-weight: 800;
  line-height: 1;
  background: var(--brand-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.text {
  font-size: 16px;
  color: var(--text-secondary);
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}
</style>
