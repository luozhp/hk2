<template>
  <div class="nf">
    <div class="nf-code">404</div>
    <div class="nf-title">页面不存在</div>
    <div class="nf-desc">你访问的页面可能已被移除，或链接输入有误。</div>
    <el-button type="primary" @click="$router.push('/dashboard')">返回工作台</el-button>
  </div>
</template>

<style scoped>
.nf {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 80px 20px;
  text-align: center;
}
.nf-code { font-size: 64px; font-weight: 800; color: #c0c4cc; line-height: 1; }
.nf-title { font-size: 18px; font-weight: 600; color: #303133; }
.nf-desc { font-size: 13px; color: #909399; margin-bottom: 8px; }
</style>
