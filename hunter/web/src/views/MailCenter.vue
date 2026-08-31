<template>
  <div>
    <el-row :gutter="16">
      <el-col :span="6"><el-card shadow="hover" class="mini-stat"><div class="v">{{ stats.total }}</div><div class="l">累计发送</div></el-card></el-col>
      <el-col :span="6"><el-card shadow="hover" class="mini-stat"><div class="v">{{ stats.openRate }}%</div><div class="l">打开率</div></el-card></el-col>
      <el-col :span="6"><el-card shadow="hover" class="mini-stat"><div class="v" style="color:#67c23a">{{ stats.replyRate }}%</div><div class="l">回复率（行业 3-8%）</div></el-card></el-col>
      <el-col :span="6"><el-card shadow="hover" class="mini-stat"><div class="v" style="color:#e6a23c">{{ stats.remainingToday }}</div><div class="l">今日剩余配额（{{ stats.dailyLimit }}封/日）</div></el-card></el-col>
      </el-row>

      <el-alert
      v-if="provider !== 'mock'"
      style="margin-top:12px"
      type="success"
      :closable="false"
      :title="`真实邮件已启用（${provider === 'smtp' ? 'SMTP' : provider}），发送将实际投递并回写投递状态`" show-icon />
      <el-alert
      v-else
      style="margin-top:12px"
      type="info"
      :closable="false"
      title="当前为模拟发送模式（不实际投递）。配置 server/.env 的 MAIL_PROVIDER=smtp 并填 SMTP 凭证即可启用真实发送" show-icon />

    <el-row :gutter="16" style="margin-top:16px">
      <!-- 模板列表 -->
      <el-col :span="9">
        <el-card shadow="never" style="height:100%">
          <template #header>邮件模板（开发信）</template>
          <div v-for="t in templates" :key="t.id" class="template-item" :class="{ active: activeTemplate?.id === t.id }" @click="selectTemplate(t)">
            <div class="t-name">{{ t.name }}</div>
            <div class="t-subject">{{ t.subject }}</div>
          </div>
        </el-card>
      </el-col>

      <!-- 编辑发送 -->
      <el-col :span="15">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>开发信发送</span>
              <el-button size="small" type="primary" @click="send">发送</el-button>
            </div>
          </template>

          <el-form label-width="90px">
            <el-form-item label="收件客户">
              <el-select v-model="targetType" style="width:180px" @change="loadCandidates">
                <el-option label="按标签选择" value="tag" />
                <el-option label="全部客户" value="all" />
              </el-select>
              <el-select v-if="targetType === 'tag'" v-model="tagValue" style="width:180px;margin-left:8px" @change="loadCandidates">
                <el-option v-for="t in tagOptions" :key="t" :label="t" :value="t" />
              </el-select>
              <span class="candidate-note">已选 {{ candidates.length }} 个客户</span>
            </el-form-item>
            <el-form-item label="主题">
              <el-input :model-value="preview.subject" readonly />
            </el-form-item>
            <el-form-item label="正文">
              <el-input :model-value="preview.body" type="textarea" :rows="13" readonly />
            </el-form-item>
            <el-form-item label="发送前检查">
              <el-alert
                v-if="checkResult"
                :type="checkResult.ok ? 'success' : 'error'"
                :title="checkResult.message"
                :closable="false" show-icon />
              <div v-if="checkResult?.ok" style="font-size:12px;color:#909399;margin-top:6px">
                自动附随合规文档：<el-tag v-for="d in checkResult.requiredDocs" :key="d" size="small" effect="plain">{{ d }}</el-tag>
              </div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <!-- 发送记录 -->
    <el-card shadow="never" style="margin-top:16px">
      <template #header>发送记录</template>
      <el-table :data="records" size="small">
        <el-table-column prop="subject" label="主题" min-width="220" show-overflow-tooltip />
        <el-table-column prop="to" label="收件人" min-width="160" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sender" label="发送人" width="80" />
        <el-table-column label="发送时间" width="130">
          <template #default="{ row }">{{ formatTime(row.sentAt) }}</template>
        </el-table-column>
        <el-table-column label="回写演示" width="150" v-if="provider !== 'mock'">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="simulateWebhook(row, 'opened')">已打开</el-button>
            <el-button size="small" link type="success" @click="simulateWebhook(row, 'replied')">已回复</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api';

const templates = ref<any[]>([]);
const activeTemplate = ref<any>(null);
const records = ref<any[]>([]);
const stats = ref<any>({ total: 0, openRate: 0, replyRate: 0, remainingToday: 50, dailyLimit: 50 });
const provider = ref('mock');
const targetType = ref('tag');
const tagValue = ref('');
const tagOptions = ref<string[]>([]);
const candidates = ref<any[]>([]);
const preview = reactive<any>({ subject: '', body: '' });
const checkResult = ref<any>(null);

const statusLabel = (s: string) => ({ sent: '已发送', opened: '已打开', replied: '已回复', delivered: '已送达', failed: '发送失败' } as any)[s] || s;
const statusType = (s: string) => ({ sent: 'info', opened: 'warning', replied: 'success', delivered: 'primary', failed: 'danger' } as any)[s] || 'info';

const formatTime = (d: string) => {
  const date = new Date(d);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const selectTemplate = (t: any) => {
  activeTemplate.value = t;
  runPreview(t);
  runCheck(t);
};

const runPreview = async (t: any) => {
  const res = await api.mail.preview({ templateId: t.id, contactName: 'John' });
  Object.assign(preview, res);
};

const runCheck = async (t: any) => {
  checkResult.value = await api.mail.check({ subject: t.subject, body: t.body });
};

const loadCandidates = async () => {
  if (targetType.value === 'all') {
    candidates.value = await api.companies.list({});
  } else {
    candidates.value = await api.companies.list({ tag: tagValue.value });
  }
};

const send = async () => {
  if (!activeTemplate.value || !candidates.value.length) return ElMessage.warning('请选择模板与收件客户');
  const res = await api.mail.send({
    templateId: activeTemplate.value.id,
    subject: preview.subject,
    body: preview.body,
    recipients: candidates.value.map((c) => ({ companyId: c.id, contactId: null, email: c.email || `${c.name?.toLowerCase().replace(/\s+/g, '')}@example.com` })),
    sender: 'u1',
  });
  if (res.ok) {
    ElMessage.success(res.message);
    loadStats();
    loadRecords();
  } else {
    ElMessage.error(res.message);
  }
};

// 真实邮件服务商的投递状态回写演示（opened/replied）
const simulateWebhook = async (row: any, evt: string) => {
  await api.mail.webhook({ id: row.id, event: evt });
  ElMessage.success(`已回写状态：${evt === 'opened' ? '已打开' : '已回复'}`);
  loadStats();
  loadRecords();
};

const loadStats = async () => { stats.value = await api.mail.stats(); };
const loadRecords = async () => { records.value = await api.mail.records({}); };

onMounted(async () => {
  templates.value = await api.mail.templates();
  try { provider.value = (await api.mail.provider()).provider || 'mock'; } catch { /* mock */ }
  tagOptions.value = await api.companies.tags();
  if (tagOptions.value.length) tagValue.value = tagOptions.value[0];
  if (templates.value.length) selectTemplate(templates.value[0]);
  loadCandidates();
  loadStats();
  loadRecords();
});

watch(targetType, () => { tagValue.value = tagOptions.value[0] || ''; });
</script>

<style scoped>
.mini-stat { text-align: center; }
.v { font-size: 26px; font-weight: 700; color: #409eff; }
.l { font-size: 12px; color: #909399; margin-top: 4px; }
.template-item { padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 10px; cursor: pointer; }
.template-item.active { border-color: #409eff; background: #f0f7ff; }
.t-name { font-weight: 600; font-size: 13px; }
.t-subject { font-size: 12px; color: #909399; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.candidate-note { margin-left: 10px; font-size: 12px; color: #67c23a; }
</style>
