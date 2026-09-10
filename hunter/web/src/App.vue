<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();

onMounted(() => {
  // 刷新页面后校验 token 并恢复最新用户信息
  if (auth.token) {
    auth.fetchMe();
  }
});
</script>

<style>
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  background: #f5f7fa;
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif;
}
</style>
