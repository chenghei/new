<template>
  <div class="mall-layout">
    <MallHeader />
    <main class="mall-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <MallFooter />
    <el-backtop :right="40" :bottom="80" />
  </div>
</template>

<script setup>
import MallHeader from './MallHeader.vue'
import MallFooter from './MallFooter.vue'
</script>

<style scoped>
.mall-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.mall-main {
  flex: 1;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
