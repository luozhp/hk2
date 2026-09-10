<template>
  <div v-loading="loading">
    <!-- 概览 -->
    <el-row :gutter="16">
      <el-col v-for="s in summary" :key="s.label" :xs="12" :md="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value" :class="s.tone">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="panel-card" style="margin-top:16px">
      <template #header>
        <div class="panel-head">
          <div class="panel-title">
            <el-icon class="panel-icon"><Tickets /></el-icon>
            <span>询盘列表</span>
          </div>
          <div class="panel-actions">
            <el-select v-model="filters.channel" placeholder="来源渠道" clearable size="small" style="width:130px" @change="load">
              <el-option v-for="c in channels" :key="c.value" :label="c.label" :value="c.value" />
            </el-select>
            <el-select v-model="filters.status" placeholder="处理状态" clearable size="small" style="width:120px" @change="load">
              <el-option v-for="s in statuses" :key="s.value" :label="s.label" :value="s.value" />
            </el-select>
            <el-button size="small" type="primary" plain @click="openCreate">+ 登记询盘</el-button>
          </div>
        </div>
      </template>

      <el-table :data="rows" size="small" stripe>
        <el-table-column label="时间" width="110">
          <template #default="{ row }">{{ fmtDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="客户" min-width="150">
          <template #default="{ row }">
            <span v-if="row.companyName">{{ row.companyName }}</span>
            <span v-else class="muted">未关联</span>
          </template>
        </el-table-column>
        <el-table-column label="来源渠道" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="channelType(row.sourceChannel)">{{ channelLabel(row.sourceChannel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="来源关键词" min-width="200">
          <template #default="{ row }">
            <span v-if="row.attributedKeyword" class="kw">{{ row.attributedKeyword }}</span>
            <span v-else class="muted">未归因</span>
          </template>
        </el-table-column>
        <el-table-column prop="landingPage" label="落地页" width="110">
          <template #default="{ row }">
            <span v-if="row.landingPage" class="lp">{{ row.landingPage }}</span>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="询盘内容" min-width="240" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="SLA" width="100">
          <template #default="{ row }">
            <span v-if="row.status === 'closed'" class="muted">已完成</span>
            <span v-else-if="row.overdue" class="overdue">已超时</span>
            <span v-else class="ok">{{ fmtDate(row.slaDeadline) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button link type="primary" size="small" v-if="row.status !== 'closed'" @click="advance(row)">推进</el-button>
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无询盘，点击右上角「登记询盘」录入" :image-size="80" />
        </template>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog" :title="editing ? '编辑询盘' : '登记询盘'" width="600px">
      <el-alert
        title="来源关键词与落地页是归因的关键：独立站表单建议带 ?kw=来源词&lp=落地页 参数，进系统后直接回填这两项。"
        type="info" :closable="false" show-icon style="margin-bottom:14px" />
      <el-form label-width="100px">
        <el-form-item label="询盘内容" required>
          <el-input v-model="form.content" type="textarea" :rows="3" placeholder="Requesting bulk price list for cream chargers" />
        </el-form-item>
        <el-form-item label="来源渠道">
          <el-select v-model="form.sourceChannel" style="width:100%">
            <el-option v-for="c in channels" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源关键词">
          <el-select v-model="form.attributedKeyword" filterable clearable allow-create placeholder="选择或输入来源词" style="width:100%">
            <el-option v-for="k in keywordOptions" :key="k" :label="k" :value="k" />
          </el-select>
        </el-form-item>
        <el-form-item label="落地页">
          <el-select v-model="form.landingPage" clearable placeholder="对应独立站页面" style="width:100%">
            <el-option v-for="p in landingOptions" :key="p" :label="p" :value="p" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联客户">
          <el-select v-model="form.companyId" filterable clearable placeholder="可选，关联已有客户" style="width:100%">
            <el-option v-for="c in companies" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="联系邮箱">
          <el-input v-model="form.contactEmail" placeholder="buyer@company.com" />
        </el-form-item>
        <el-form-item label="处理状态" v-if="editing">
          <el-select v-model="form.status" style="width:100%">
            <el-option v-for="s in statuses" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api';

const CHANNELS = [
  { value: 'seo', label: '独立站自然搜索', type: 'success' },
  { value: 'ads', label: 'Google Ads', type: 'primary' },
  { value: 'platform', label: 'B2B 平台', type: 'warning' },
  { value: 'email', label: '邮件回复', type: 'info' },
  { value: 'referral', label: '推荐/其他', type: 'info' },
];
const STATUSES = [
  { value: 'pending', label: '待处理', type: 'warning' },
  { value: 'processing', label: '处理中', type: 'primary' },
  { value: 'closed', label: '已关闭', type: 'info' },
];

const channels = CHANNELS;
const statuses = STATUSES;

const loading = ref(false);
const rows = ref<any[]>([]);
const companies = ref<any[]>([]);
const keywordOptions = ref<string[]>([]);
const landingOptions = ref<string[]>([]);
const stats = ref<any>({ byChannel: {} });
const dialog = ref(false);
const editing = ref<any>(null);
const filters = reactive<any>({ channel: '', status: '' });
const form = reactive<any>({
  content: '', sourceChannel: 'seo', attributedKeyword: '', landingPage: '',
  companyId: '', contactEmail: '', status: 'pending',
});

const summary = computed(() => [
  { label: '询盘总数', value: stats.value.total ?? 0, tone: '' },
  { label: '待处理', value: stats.value.pending ?? 0, tone: 'warn' },
  { label: '已归因（有来源词）', value: stats.value.attributed ?? 0, tone: 'ok' },
  { label: 'SLA 超时', value: stats.value.overdue ?? 0, tone: 'danger' },
]);

const channelLabel = (v: string) => CHANNELS.find((c) => c.value === v)?.label || v || '—';
const channelType = (v: string) => (CHANNELS.find((c) => c.value === v)?.type as any) || 'info';
const statusLabel = (v: string) => STATUSES.find((s) => s.value === v)?.label || v || '—';
const statusType = (v: string) => (STATUSES.find((s) => s.value === v)?.type as any) || 'info';
const fmtDate = (v: string) => (v ? String(v).slice(0, 10) : '—');

const load = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (filters.channel) params.channel = filters.channel;
    if (filters.status) params.status = filters.status;
    const [list, s] = await Promise.all([api.inquiries.list(params), api.inquiries.stats()]);
    rows.value = Array.isArray(list) ? list : [];
    stats.value = s || { byChannel: {} };
  } finally {
    loading.value = false;
  }
};

const loadOptions = async () => {
  const [kws, lps, comps] = await Promise.all([
    api.keywords.list(), api.landing.list(), api.companies.list(),
  ]);
  keywordOptions.value = (kws || []).map((k: any) => k.keyword);
  landingOptions.value = (lps || []).map((p: any) => p.path);
  companies.value = comps || [];
};

const openCreate = () => {
  editing.value = null;
  Object.assign(form, {
    content: '', sourceChannel: 'seo', attributedKeyword: '', landingPage: '',
    companyId: '', contactEmail: '', status: 'pending',
  });
  dialog.value = true;
};

const openEdit = (row: any) => {
  editing.value = row;
  Object.assign(form, {
    content: row.content || '',
    sourceChannel: row.sourceChannel || 'seo',
    attributedKeyword: row.attributedKeyword || '',
    landingPage: row.landingPage || '',
    companyId: row.companyId || '',
    contactEmail: row.contactEmail || '',
    status: row.status || 'pending',
  });
  dialog.value = true;
};

const save = async () => {
  if (!form.content.trim()) return ElMessage.warning('询盘内容必填');
  const payload: any = {
    content: form.content.trim(),
    sourceChannel: form.sourceChannel,
    attributedKeyword: form.attributedKeyword || null,
    landingPage: form.landingPage || null,
    companyId: form.companyId || null,
    contactEmail: form.contactEmail || null,
  };
  if (editing.value) {
    payload.status = form.status;
    await api.inquiries.update(editing.value.id, payload);
    ElMessage.success('已更新');
  } else {
    await api.inquiries.create(payload);
    ElMessage.success('已登记');
  }
  dialog.value = false;
  load();
};

const advance = async (row: any) => {
  const next = row.status === 'pending' ? 'processing' : 'closed';
  await api.inquiries.update(row.id, { status: next });
  ElMessage.success(`已推进为「${statusLabel(next)}」`);
  load();
};

const remove = async (row: any) => {
  await ElMessageBox.confirm('删除该询盘？', '删除', { type: 'warning' });
  await api.inquiries.remove(row.id);
  ElMessage.success('已删除');
  load();
};

onMounted(async () => {
  await loadOptions();
  load();
});
</script>

<style scoped>
.stat-card { border-radius: 12px; text-align: center; transition: box-shadow 0.25s ease; }
.stat-card:hover { box-shadow: 0 10px 28px rgba(15, 23, 42, 0.1); }
.stat-value { font-size: 26px; font-weight: 700; color: #1f2937; font-variant-numeric: tabular-nums; }
.stat-value.ok { color: #16a34a; }
.stat-value.warn { color: #d97706; }
.stat-value.danger { color: #dc2626; }
.stat-label { font-size: 12px; color: #909399; margin-top: 4px; }

.panel-card { border-radius: 12px; }
.panel-head { display: flex; justify-content: space-between; align-items: center; }
.panel-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #1f2937; }
.panel-icon { color: #409eff; font-size: 16px; }
.panel-actions { display: flex; align-items: center; gap: 8px; }

.kw { color: #0369a1; }
.lp { color: #16a34a; }
.muted { color: #c0c4cc; }
.overdue { color: #dc2626; font-weight: 600; }
.ok { color: #16a34a; }

:deep(.el-table th.el-table__cell) { background: #f8fafc; color: #64748b; font-weight: 600; }
:deep(.el-table tbody tr:hover > td.el-table__cell) { background: #eef6ff; }
</style>
