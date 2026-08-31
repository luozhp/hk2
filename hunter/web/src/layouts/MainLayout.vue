<template>
  <el-container class="layout">
    <el-aside width="220px" class="aside">
      <div class="logo">
        <el-icon :size="24" color="#409eff"><Compass /></el-icon>
        <div>
          <div class="logo-title">Hunter</div>
          <div class="logo-sub">B2B 寻客系统</div>
        </div>
      </div>
      <el-menu :default-active="route.path" router class="menu">
        <el-menu-item index="/dashboard"><el-icon><Odometer /></el-icon>工作台</el-menu-item>
        <el-menu-item index="/discover"><el-icon><Search /></el-icon>线索采集</el-menu-item>
        <el-menu-item index="/leads"><el-icon><Collection /></el-icon>线索池</el-menu-item>
        <el-menu-item index="/customers"><el-icon><OfficeBuilding /></el-icon>客户管理</el-menu-item>
        <el-menu-item index="/mail"><el-icon><Message /></el-icon>邮件中心</el-menu-item>
        <el-menu-item index="/compliance"><el-icon><Lock /></el-icon>合规管理</el-menu-item>
        <el-menu-item index="/keywords"><el-icon><Key /></el-icon>关键词库</el-menu-item>
        <el-menu-item index="/analytics"><el-icon><DataAnalysis /></el-icon>数据看板</el-menu-item>
        <el-menu-item index="/settings"><el-icon><Setting /></el-icon>系统设置</el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-title">{{ route.meta.title || '工作台' }}</div>
        <div class="header-right">
          <el-tag size="small" type="warning" effect="plain">MVP 原型</el-tag>
          <el-dropdown>
            <span class="user">
              <el-avatar :size="30" style="background:#409eff">张</el-avatar>
              <span>张伟 · 业务员</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>个人中心</el-dropdown-item>
                <el-dropdown-item divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
const route = useRoute();
</script>

<style scoped>
.layout { height: 100vh; }
.aside {
  background: #001529;
  display: flex;
  flex-direction: column;
}
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  color: #fff;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.logo-title { font-size: 18px; font-weight: 700; line-height: 1.1; }
.logo-sub { font-size: 11px; color: rgba(255,255,255,.5); }
.menu {
  flex: 1;
  border-right: none;
  background: transparent;
  --el-menu-item-color: rgba(255,255,255,.65);
  --el-menu-item-hover-bg-color: rgba(255,255,255,.08);
  --el-menu-active-color: #fff;
  --el-menu-bg-color: transparent;
}
.menu .el-menu-item.is-active { background: #409eff; }
.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e7eb;
  height: 60px;
}
.header-title { font-size: 16px; font-weight: 600; color: #1f2937; }
.header-right { display: flex; align-items: center; gap: 16px; }
.user { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #374151; font-size: 14px; }
.main { padding: 16px; overflow: auto; }
</style>
