<template>
  <footer class="mall-footer">
    <div class="container">
      <div class="footer-features">
        <div class="feature" v-for="item in features" :key="item.text">
          <el-icon size="26" class="feature-icon"><component :is="item.icon" /></el-icon>
          <div>
            <p class="feature-title">{{ item.title }}</p>
            <p class="feature-desc">{{ item.text }}</p>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <p>优选商城</p>
        <!-- <p class="copyright">仅供学习交流使用，模拟交易不产生真实订单与支付</p> -->
      </div>
    </div>
  </footer>
</template>

<script setup>
const features = [
  { icon: 'GoodsFilled', title: '正品保障', text: '精选好物 品质放心' },
  { icon: 'Van', title: '极速配送', text: '模拟物流 快速送达' },
  { icon: 'RefreshLeft', title: '无忧退换', text: '退换货 一键申请' },
  { icon: 'Service', title: '贴心服务', text: 'AI 助手 全程陪伴' }
]
</script>

<style scoped>
.mall-footer {
  margin-top: 40px;
  background: #fff;
  border-top: 1px solid var(--border-color);
  padding: 32px 0 24px;
}

.footer-features {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-color);
}

.feature {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.feature-icon {
  color: var(--brand);
}

.feature-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.feature-desc {
  font-size: 12px;
  color: #999;
}

.footer-bottom {
  padding-top: 20px;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.copyright {
  margin-top: 6px;
  font-size: 12px;
  color: #bbb;
}

@media (max-width: 768px) {
  .footer-features {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
