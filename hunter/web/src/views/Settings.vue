<template>
  <div>
    <el-row :gutter="16">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>集成配置</template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="独立站">
              <div class="site-row">
                <el-input v-model="siteForm.siteUrl" size="small" placeholder="https://your-store.com" style="flex:1" />
                <el-button size="small" type="primary" plain :loading="siteSaving" @click="saveSite">保存</el-button>
              </div>
              <div class="site-hint" v-pre>保存后生效于：开发信模板变量（{{websiteLink}} / {{msdsLink}}）、关键词库落地页 URL</div>
            </el-descriptions-item>
            <el-descriptions-item label="线索采集">
              <el-tag size="small" :type="discoverStatus.type">
                {{ discoverStatus.text }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="线下询盘基数">
              <div class="site-row">
                <el-input-number
                  v-model="siteForm.offlineInquiries" size="small"
                  :min="0" :max="9999" :controls="false" style="width:120px" />
                <el-button size="small" type="primary" plain :loading="siteSaving" @click="saveSite">保存</el-button>
              </div>
              <div class="site-hint">系统外（展会 / 电话 / 老客户直接下单）获得的询盘数量，计入「2026 ≥ 100 条询盘」目标与看板 KPI 跟踪表；系统内录入的线上询盘会实时叠加在它之上</div>
            </el-descriptions-item>

            <el-descriptions-item label="邮件发送">
              <el-tag size="small" :type="mailProvider === 'mock' ? 'info' : 'success'">
                {{ mailProvider === 'mock' ? '模拟通道（未配置 SMTP）' : '真实 SMTP（' + mailProvider + '）' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="收件箱（IMAP）">
              <el-tag size="small" type="info">规划中（V1.1）</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="LinkedIn">
              <el-tag size="small" type="info">规划中（V1.2）</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="海关数据">
              <el-tag size="small" type="success">导入模式（已启用）</el-tag>
              <el-button size="small" text type="primary" style="margin-left:8px" @click="goCustoms">前往导入</el-button>
            </el-descriptions-item>
          </el-descriptions>
          <el-alert
            title="配置方式：编辑 server/.env 并重启后端（参考 server/.env.example）。真实邮件与搜索凭证不会存于浏览器。"
            type="info" :closable="false" show-icon style="margin-top:12px" />
        </el-card>

        <el-card shadow="never" style="margin-top:16px">
          <template #header>邮箱发送策略（防垃圾信）</template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="单账号日上限">
              {{ mailStats.dailyLimit || 50 }} 封（今日剩余 {{ mailStats.remainingToday ?? '-' }} 封）
            </el-descriptions-item>
            <el-descriptions-item label="发送间隔">60-120 秒随机</el-descriptions-item>
            <el-descriptions-item label="个性化要求">每封自动替换公司名/联系人名</el-descriptions-item>
            <el-descriptions-item label="域名认证">SPF / DKIM / DMARC（发送前配置）</el-descriptions-item>
            <el-descriptions-item label="退订合规">CAN-SPAM：自动退订 + 真实发件信息</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span>团队与权限</span>
              <el-button
                v-if="isAdmin"
                size="small" type="primary" plain
                @click="userDialogVisible = true"
              >新增成员</el-button>
            </div>
          </template>
          <el-table :data="users" size="small" v-loading="usersLoading">
            <el-table-column prop="name" label="姓名" width="90" />
            <el-table-column prop="email" label="邮箱" min-width="170" />
            <el-table-column label="角色" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="roleType(row.role)">{{ roleLabel(row.role) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag size="small" :type="row.status === 'disabled' ? 'danger' : 'success'">
                  {{ row.status === 'disabled' ? '停用' : '正常' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column v-if="isAdmin" label="操作" width="130">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="resetPwd(row)">重置密码</el-button>
                <el-button
                  v-if="row.role !== 'admin'"
                  link :type="row.status === 'disabled' ? 'success' : 'danger'"
                  size="small"
                  @click="toggleUser(row)"
                >{{ row.status === 'disabled' ? '启用' : '停用' }}</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-alert
            title="权限矩阵：管理者（全部权限 + 成员管理 + 系统设置）；运营专员（线索/邮件/合规/看板）；业务员（本人范围客户与发送）"
            type="info" :closable="false" show-icon style="margin-top:12px" />
        </el-card>

        <el-card shadow="never" style="margin-top:16px">
          <template #header>关于系统</template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="版本">Hunter v1.0.0（正式版）</el-descriptions-item>
            <el-descriptions-item label="技术栈">Vue 3 + Element Plus / NestJS + TypeScript</el-descriptions-item>
            <el-descriptions-item label="数据存储">SQLite（server/data/hunter.db，WAL 模式，自动备份）</el-descriptions-item>
            <el-descriptions-item label="安全认证">JWT + bcrypt，角色权限控制</el-descriptions-item>
            <el-descriptions-item label="关联文档">
              《B2B寻客系统产品功能文档》《架构选型与原型设计文档》
            </el-descriptions-item>
          </el-descriptions>
          <el-button
            v-if="isAdmin"
            type="danger" plain size="small" style="margin-top:16px"
            @click="resetData"
          >重置系统数据</el-button>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="userDialogVisible" title="新增成员" width="440px">
      <el-form label-width="80px">
        <el-form-item label="姓名"><el-input v-model="userForm.name" placeholder="成员姓名" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="userForm.email" placeholder="登录邮箱" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userForm.role" style="width:100%">
            <el-option label="业务员" value="sales" />
            <el-option label="运营专员" value="operator" />
            <el-option label="管理者" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="初始密码">
          <el-input v-model="userForm.password" placeholder="留空则使用默认密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="createUser">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api } from '../api';
import { useAuthStore, ROLE_LABEL } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const goCustoms = () => router.push('/customs');
const isAdmin = computed(() => auth.user?.role === 'admin');

const siteUrl = ref('');
const siteSaving = ref(false);
const siteForm = reactive({ siteUrl: '', brandName: '', offlineInquiries: 12 });

const loadSite = async () => {
  const s = await api.settings.get();
  siteForm.siteUrl = s?.siteUrl || '';
  siteForm.brandName = s?.brandName || '';
  siteForm.offlineInquiries = Number(s?.offlineInquiries ?? 12) || 0;
  siteUrl.value = siteForm.siteUrl;
};

const saveSite = async () => {
  const url = siteForm.siteUrl.trim().replace(/\/+$/, '');
  if (!url) return ElMessage.warning('独立站域名不能为空');
  if (!/^https?:\/\/.+/.test(url)) return ElMessage.warning('请以 http:// 或 https:// 开头');
  const offline = Number(siteForm.offlineInquiries);
  if (!Number.isInteger(offline) || offline < 0) return ElMessage.warning('线下询盘基数需为非负整数');
  siteSaving.value = true;
  try {
    const s = await api.settings.update({ siteUrl: url, brandName: siteForm.brandName, offlineInquiries: offline });
    siteForm.siteUrl = s.siteUrl;
    siteForm.offlineInquiries = Number(s.offlineInquiries ?? 12) || 0;
    siteUrl.value = s.siteUrl;
    ElMessage.success('已保存，开发信、落地页链接与看板 KPI 将使用新配置');
  } finally {
    siteSaving.value = false;
  }
};

const discoverStatus = ref<{ type: string; text: string }>({ type: 'info', text: '模拟数据（未配置真实搜索）' });
const mailProvider = ref('mock');
const mailStats = ref<any>({});
const users = ref<any[]>([]);
const usersLoading = ref(false);

const userDialogVisible = ref(false);
const creating = ref(false);
const userForm = reactive({ name: '', email: '', role: 'sales', password: '' });

const roleLabel = (r: string) => ROLE_LABEL[r] || r;
const roleType = (r: string) => ({ sales: 'info', operator: 'warning', admin: 'danger' } as any)[r] || 'info';

onMounted(async () => {
  try {
    await loadSite();
  } catch { /* 拦截器已提示 */ }
  try {
    const [dis, mail, stats] = await Promise.all([
      api.discover.provider(),
      api.mail.provider(),
      api.mail.stats(),
    ]);
    if (dis.provider === 'mock') {
      discoverStatus.value = { type: 'info', text: '模拟数据（配置凭证后可启用真实搜索）' };
    } else if (dis.configured) {
      discoverStatus.value = { type: 'success', text: `真实搜索（${dis.label || dis.provider}）已配置` };
    } else {
      discoverStatus.value = {
        type: 'warning',
        text: `已启用 ${dis.label || dis.provider}，缺少凭证（${(dis.missing || []).join('、')}），将降级为模拟`,
      };
    }
    mailProvider.value = mail.provider;
    mailStats.value = stats;
  } catch { /* 未登录等场景由拦截器处理 */ }
  if (isAdmin.value) loadUsers();
});

async function loadUsers() {
  usersLoading.value = true;
  try {
    users.value = await api.auth.users();
  } finally {
    usersLoading.value = false;
  }
}

async function createUser() {
  if (!userForm.name || !userForm.email) {
    ElMessage.warning('请填写姓名与邮箱');
    return;
  }
  creating.value = true;
  try {
    await api.auth.createUser({
      name: userForm.name,
      email: userForm.email,
      role: userForm.role,
      password: userForm.password || undefined,
    });
    ElMessage.success('成员已创建');
    userDialogVisible.value = false;
    userForm.name = '';
    userForm.email = '';
    userForm.password = '';
    loadUsers();
  } catch {
    /* 拦截器已提示 */
  } finally {
    creating.value = false;
  }
}

async function resetPwd(row: any) {
  await ElMessageBox.confirm(`将 ${row.name} 的密码重置为默认密码？`, '重置密码', { type: 'warning' });
  await api.auth.resetPassword(row.id);
  ElMessage.success('密码已重置为默认密码');
}

async function toggleUser(row: any) {
  const disabling = row.status !== 'disabled';
  await ElMessageBox.confirm(
    disabling ? `确定停用 ${row.name}？停用后无法登录。` : `确定启用 ${row.name}？`,
    '账号状态',
    { type: 'warning' },
  );
  await api.auth.toggleStatus(row.id, disabling ? 'disabled' : 'active');
  ElMessage.success('状态已更新');
  loadUsers();
}

const resetData = async () => {
  await ElMessageBox.confirm('重置将恢复初始种子数据（现有业务数据将被覆盖），确定继续？', '重置系统数据', { type: 'warning' });
  const axios = (await import('axios')).default;
  await axios.post('/api/reset');
  ElMessage.success('数据已重置（刷新页面生效）');
};
</script>

<style scoped>
.site-row { display: flex; align-items: center; gap: 8px; }
.site-hint { font-size: 12px; color: #c0c4cc; margin-top: 6px; line-height: 1.6; }
</style>
