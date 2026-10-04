<template>
  <div class="not-found">
    <div class="code">404</div>
    <p class="text">抱歉，你访问的页面不存在</p>
    <el-button type="primary" round @click="$router.push('/')">返回首页</el-button>
  </div>
</template>

<script setup></script>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--bg-page);
}

.code {
  font-size: 110px;
  font-weight: 800;
  line-height: 1;
  background: var(--brand-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.text {
  font-size: 15px;
  color: var(--text-secondary);
}
</style>
