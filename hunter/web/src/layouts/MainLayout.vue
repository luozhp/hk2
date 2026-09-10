<template>
  <el-container class="layout">
    <el-aside
      :width="isCollapse ? '64px' : '224px'"
      class="aside"
      :class="{ collapsed: isCollapse }"
    >
      <router-link to="/dashboard" class="logo" aria-label="回到工作台">
        <div class="logo-icon">
          <el-icon :size="20"><Compass /></el-icon>
        </div>
        <div v-show="!isCollapse" class="logo-text">
          <div class="logo-title">Hunter</div>
          <div class="logo-sub">B2B 寻客系统</div>
        </div>
      </router-link>

      <div class="menu-scroll">
        <nav class="nav">
          <template v-for="group in navGroups" :key="group.label">
            <div v-show="!isCollapse" class="nav-group-title">{{ group.label }}</div>
            <router-link
              v-for="item in group.items"
              :key="item.path"
              :to="item.path"
              class="nav-item"
              :class="{ active: isActive(item) }"
              :title="isCollapse ? item.label : ''"
            >
              <span class="nav-item-indicator"></span>
              <el-icon class="nav-item-icon" :size="18"><component :is="item.icon" /></el-icon>
              <span v-show="!isCollapse" class="nav-item-label">{{ item.label }}</span>
            </router-link>
          </template>
        </nav>
      </div>

      <div class="aside-footer">
        <div v-show="!isCollapse" class="version">v1.0.0</div>
      </div>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-button
            class="collapse-btn"
            text circle
            :aria-label="isCollapse ? '展开菜单' : '收起菜单'"
            @click="isCollapse = !isCollapse"
          >
            <el-icon :size="18"><Expand v-if="isCollapse" /><Fold v-else /></el-icon>
          </el-button>
          <div class="header-title">{{ route.meta.title || '工作台' }}</div>
        </div>
        <div class="header-right">
          <el-tag size="small" type="success" effect="plain" v-if="auth.user?.role === 'admin'">管理者</el-tag>
          <el-tag size="small" type="warning" effect="plain" v-else-if="auth.user?.role === 'operator'">运营专员</el-tag>
          <el-tag size="small" type="info" effect="plain" v-else>业务员</el-tag>
          <el-dropdown @command="onCommand">
            <span class="user">
              <el-avatar :size="30" style="background:#409eff">{{ (auth.user?.name || '用')[0] }}</el-avatar>
              <span>{{ auth.user?.name }} · {{ roleLabel(auth.user?.role) }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  <el-icon><Message /></el-icon>{{ auth.user?.email }}
                </el-dropdown-item>
                <el-dropdown-item command="password" divided>
                  <el-icon><Key /></el-icon>修改密码
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
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

  <el-dialog v-model="pwdVisible" title="修改密码" width="420px">
    <el-form label-width="80px">
      <el-form-item label="原密码">
        <el-input v-model="pwdForm.oldPassword" type="password" show-password placeholder="请输入原密码" autocomplete="current-password" />
      </el-form-item>
      <el-form-item label="新密码">
        <el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="至少 6 位" autocomplete="new-password" />
      </el-form-item>
      <el-form-item label="确认新密码">
        <el-input v-model="pwdForm.confirm" type="password" show-password placeholder="再次输入新密码" autocomplete="new-password" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="pwdVisible = false">取消</el-button>
      <el-button type="primary" :loading="pwdLoading" @click="submitPassword">确认修改</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useAuthStore, ROLE_LABEL } from '../stores/auth';
import { api } from '../api';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const isCollapse = ref(false);

const roleLabel = (role?: string) => ROLE_LABEL[role || 'sales'] || '业务员';

const pwdVisible = ref(false);
const pwdLoading = ref(false);
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirm: '' });

function onCommand(cmd: string) {
  if (cmd === 'logout') onLogout();
  if (cmd === 'password') {
    pwdForm.oldPassword = '';
    pwdForm.newPassword = '';
    pwdForm.confirm = '';
    pwdVisible.value = true;
  }
}

async function onLogout() {
  await ElMessageBox.confirm('确定退出登录？', '退出确认', { type: 'warning' });
  auth.logout();
  router.push('/login');
}

async function submitPassword() {
  if (!pwdForm.oldPassword || !pwdForm.newPassword) {
    ElMessage.warning('请填写原密码与新密码');
    return;
  }
  if (pwdForm.newPassword.length < 6) {
    ElMessage.warning('新密码至少 6 位');
    return;
  }
  if (pwdForm.newPassword !== pwdForm.confirm) {
    ElMessage.warning('两次输入的新密码不一致');
    return;
  }
  pwdLoading.value = true;
  try {
    await api.auth.changePassword(pwdForm.oldPassword, pwdForm.newPassword);
    ElMessage.success('密码已更新，请重新登录');
    pwdVisible.value = false;
    auth.logout();
    router.push('/login');
  } catch {
    /* 拦截器已提示错误 */
  } finally {
    pwdLoading.value = false;
  }
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: '总览',
    items: [{ path: '/dashboard', label: '工作台', icon: 'Odometer' }],
  },
  {
    label: '客户增长',
    items: [
      { path: '/discover', label: '线索采集', icon: 'Search' },
      { path: '/leads', label: '线索池', icon: 'Collection' },
      { path: '/inquiries', label: '询盘管理', icon: 'Tickets' },
      { path: '/customers', label: '客户管理', icon: 'OfficeBuilding' },
      { path: '/maintenance', label: '客户维护', icon: 'Service' },
      { path: '/mail', label: '邮件中心', icon: 'Message' },
    ],
  },
  {
    label: '获客渠道',
    items: [
      { path: '/customs', label: '海关数据', icon: 'Histogram' },
      { path: '/directory', label: '行业平台', icon: 'Shop' },
      { path: '/expos', label: '国际专业展会', icon: 'Trophy' },
      { path: '/channels', label: '获客渠道', icon: 'Promotion' },
    ],
  },
  {
    label: '数据与合规',
    items: [
      { path: '/analytics', label: '数据看板', icon: 'DataAnalysis' },
      { path: '/compliance', label: '合规管理', icon: 'Lock' },
      { path: '/keywords', label: '关键词库', icon: 'Key' },
    ],
  },
  {
    label: '系统',
    items: [{ path: '/settings', label: '系统设置', icon: 'Setting' }],
  },
];

function isActive(item: NavItem): boolean {
  return route.path === item.path || route.path.startsWith(`${item.path}/`);
}
</script>

<style scoped>
.layout {
  height: 100vh;
}

.aside {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #0f172a 0%, #182a4a 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  transition: width 0.25s ease;
  overflow: hidden;
}

/* Logo */
.logo {
  height: 60px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  cursor: pointer;
  text-decoration: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.logo:focus-visible { outline: 2px solid #4facfe; outline-offset: -2px; }
.aside.collapsed .logo {
  justify-content: center;
  padding: 0;
}
.logo-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: #fff;
  background: linear-gradient(135deg, #409eff, #00c6ff);
  box-shadow: 0 4px 10px rgba(64, 158, 255, 0.35);
}
.logo-title {
  font-size: 17px;
  font-weight: 700;
  line-height: 1.1;
  color: #fff;
  letter-spacing: 0.5px;
}
.logo-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 2px;
}

/* Menu scroll area */
.menu-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0 12px;
}
.menu-scroll::-webkit-scrollbar {
  width: 4px;
}
.menu-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}

/* Group title */
.nav-group-title {
  margin: 18px 20px 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.5px;
  color: rgba(255, 255, 255, 0.32);
  white-space: nowrap;
}

/* Nav item */
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  margin: 2px 12px;
  padding: 0 12px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 14px;
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.2s ease, color 0.2s ease;
}
.nav-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.07);
}
.nav-item.active {
  color: #fff;
  font-weight: 600;
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.45), rgba(64, 158, 255, 0.12));
  box-shadow: inset 0 0 0 1px rgba(79, 172, 254, 0.3);
}
.nav-item.active .nav-item-icon {
  color: #8fd0ff;
}
.nav-item-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  width: 3px;
  height: 0;
  border-radius: 2px;
  background: #4facfe;
  transform: translateY(-50%);
  transition: height 0.2s ease;
}
.nav-item.active .nav-item-indicator {
  height: 20px;
  background: linear-gradient(180deg, #4facfe, #00c6ff);
  box-shadow: 0 0 10px rgba(79, 172, 254, 0.9);
}
.nav-item-icon {
  flex-shrink: 0;
  transition: color 0.2s ease;
}

/* Collapsed */
.aside.collapsed .nav-item {
  justify-content: center;
  padding: 0;
}

/* Footer */
.aside-footer {
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 12px 0;
}
.version {
  text-align: center;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  white-space: nowrap;
}

/* Header */
.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e7eb;
  height: 60px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.collapse-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  color: #4b5563;
  transition: background-color 0.2s ease, color 0.2s ease;
}
.collapse-btn:hover {
  background: #f3f4f6;
  color: #409eff;
}
.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #374151;
  font-size: 14px;
}
.main {
  padding: 16px;
  overflow: auto;
}
</style>
