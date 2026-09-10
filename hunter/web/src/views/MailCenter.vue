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
          <div
            v-for="t in templates" :key="t.id"
            class="template-item"
            :class="{ active: activeTemplate?.id === t.id }"
            role="button" tabindex="0"
            :aria-pressed="activeTemplate?.id === t.id"
            @click="selectTemplate(t)"
            @keydown.enter="selectTemplate(t)"
            @keydown.space.prevent="selectTemplate(t)"
          >
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
              <div class="body-hint">预览按示例联系人「John」渲染；实际发送时正文中的 <code class="var-code" v-pre>{{contactName}}</code> 变量会按每个收件人自动替换</div>
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

    <!-- 发送记录 / 客户回信 -->
    <el-card shadow="never" style="margin-top:16px">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="发送记录" name="records">
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
            <el-table-column label="打开时间" width="130">
              <template #default="{ row }">{{ row.openedAt ? formatTime(row.openedAt) : '—' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="70" fixed="right">
              <template #default="{ row }">
                <el-button size="small" link type="primary" @click="openRecord(row)">明细</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane :label="`客户回信${unreadReplies ? '（' + unreadReplies + '）' : ''}`" name="replies">
          <div class="reply-toolbar">
            <span class="reply-note">
              {{ provider === 'mock' ? '未配置 IMAP 收件箱，当前为模拟回信数据（点击同步可模拟收到新回信）' : '自动拉取收件箱客户回信，按客户归集展示' }}
            </span>
            <el-button size="small" type="primary" :loading="syncing" @click="syncInbox">同步收件箱</el-button>
          </div>
          <el-empty v-if="!replies.length" description="暂无客户回信" :image-size="60" />
          <div
            v-for="r in replies" :key="r.id"
            class="reply-item" :class="{ unread: !r.isRead }"
            role="button" tabindex="0"
            @click="openReply(r)" @keydown.enter="openReply(r)"
          >
            <div class="reply-head">
              <span class="reply-from">{{ r.fromName }}</span>
              <el-tag v-if="!r.isRead" size="small" type="danger" effect="dark">新</el-tag>
              <span class="reply-company">{{ r.companyName }}</span>
              <span class="reply-time">{{ formatReplyTime(r.receivedAt) }}</span>
            </div>
            <div class="reply-subject">{{ r.subject }}</div>
            <div class="reply-snippet">{{ r.snippet }}…</div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 回信详情 -->
    <el-dialog v-model="replyVisible" title="客户回信" width="560px">
      <div v-if="replyDetail" class="reply-detail">
        <div class="rd-row"><span class="rd-label">发件人</span>{{ replyDetail.fromName }} &lt;{{ replyDetail.fromEmail }}&gt;</div>
        <div class="rd-row" v-if="replyDetail.companyName"><span class="rd-label">客户</span>{{ replyDetail.companyName }}</div>
        <div class="rd-row"><span class="rd-label">主题</span>{{ replyDetail.subject }}</div>
        <div class="rd-row"><span class="rd-label">时间</span>{{ formatReplyTime(replyDetail.receivedAt, true) }}</div>
        <div class="rd-body">{{ replyDetail.body }}</div>
      </div>
    </el-dialog>

    <!-- 发送记录投递明细 -->
    <el-dialog v-model="recordVisible" title="邮件投递明细" width="560px">
      <template v-if="recordDetail">
        <div class="rd-row"><span class="rd-label">收件人</span>{{ recordDetail.to }}</div>
        <div class="rd-row"><span class="rd-label">主题</span>{{ recordDetail.subject }}</div>
        <div class="rd-row">
          <span class="rd-label">当前状态</span>
          <el-tag size="small" :type="statusType(recordDetail.status)">{{ statusLabel(recordDetail.status) }}</el-tag>
        </div>
        <div class="tl">
          <div class="tl-item">
            <i class="tl-dot done"></i>
            <div class="tl-body">
              <div class="tl-title">已发送</div>
              <div class="tl-time">{{ formatReplyTime(recordDetail.sentAt, true) }}</div>
            </div>
          </div>
          <div class="tl-item" :class="{ muted: !isDelivered(recordDetail.status) }">
            <i class="tl-dot" :class="{ done: isDelivered(recordDetail.status) }"></i>
            <div class="tl-body">
              <div class="tl-title">已送达 SMTP</div>
              <div class="tl-time">{{ isDelivered(recordDetail.status) ? '邮件服务商已接收投递' : '等待投递中' }}</div>
            </div>
          </div>
          <div class="tl-item" :class="{ muted: !recordDetail.openedAt }">
            <i class="tl-dot" :class="{ done: !!recordDetail.openedAt }"></i>
            <div class="tl-body">
              <div class="tl-title">已打开</div>
              <div class="tl-time">{{ recordDetail.openedAt ? formatReplyTime(recordDetail.openedAt, true) : '收件人尚未打开（或邮件客户端未加载追踪图片）' }}</div>
            </div>
          </div>
          <div class="tl-item" :class="{ muted: !recordDetail.repliedAt }">
            <i class="tl-dot" :class="{ done: !!recordDetail.repliedAt }"></i>
            <div class="tl-body">
              <div class="tl-title">已回复</div>
              <div class="tl-time">{{ recordDetail.repliedAt ? formatReplyTime(recordDetail.repliedAt, true) : '尚未收到回复' }}</div>
            </div>
          </div>
        </div>
        <el-alert v-if="recordDetail.status === 'failed'" style="margin-top:16px" type="error" :closable="false" show-icon
          :title="`发送失败：${recordDetail.error || '未知原因'}`" />
        <el-alert v-else-if="provider !== 'mock'" style="margin-top:16px" type="info" :closable="false" show-icon
          title="打开状态通过邮件正文中的 1x1 追踪像素自动回写；若收件人使用纯文本客户端或邮件服务商拦截图片（Gmail / Outlook 默认不加载远程图片），记录会保持「已送达」，属正常现象" />
      </template>
    </el-dialog>
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
const activeTab = ref('records');
const replies = ref<any[]>([]);
const unreadReplies = ref(0);
const syncing = ref(false);
const replyVisible = ref(false);
const replyDetail = ref<any>(null);
const recordVisible = ref(false);
const recordDetail = ref<any>(null);

const statusLabel = (s: string) => ({ sent: '已发送', opened: '已打开', replied: '已回复', delivered: '已送达', failed: '发送失败' } as any)[s] || s;
const statusType = (s: string) => ({ sent: 'info', opened: 'warning', replied: 'success', delivered: 'primary', failed: 'danger' } as any)[s] || 'info';

const formatTime = (d: string) => {
  if (!d) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(d));
};

const formatReplyTime = (d: string, full = false) => {
  if (!d) return '';
  return new Intl.DateTimeFormat('zh-CN', full
    ? { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }
    : { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false },
  ).format(new Date(d));
};

const loadReplies = async () => {
  replies.value = await api.mail.replies();
  const c = await api.mail.unreadCount();
  unreadReplies.value = c.count;
};

const syncInbox = async () => {
  syncing.value = true;
  try {
    const res = await api.mail.syncInbox();
    ElMessage.success(res.message);
    await loadReplies();
  } finally {
    syncing.value = false;
  }
};

const openReply = async (r: any) => {
  replyDetail.value = r;
  replyVisible.value = true;
  if (!r.isRead) {
    r.isRead = true;
    unreadReplies.value = Math.max(0, unreadReplies.value - 1);
    await api.mail.markReplyRead(r.id);
  }
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
  // 传模板源码，由后端按每个收件人渲染（{{contactName}} 等变量自动替换，而非预览时写死的「John」）
  const res = await api.mail.send({
    templateId: activeTemplate.value.id,
    subject: activeTemplate.value.subject,
    body: activeTemplate.value.body,
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

const isDelivered = (s: string) => ['delivered', 'opened', 'replied'].includes(s);

const openRecord = (row: any) => {
  recordDetail.value = row;
  recordVisible.value = true;
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
  loadReplies();
});

watch(targetType, () => { tagValue.value = tagOptions.value[0] || ''; });
</script>

<style scoped>
.mini-stat { text-align: center; }
.v { font-size: 26px; font-weight: 700; color: #409eff; font-variant-numeric: tabular-nums; }
.l { font-size: 12px; color: #909399; margin-top: 4px; }
.template-item { padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 10px; cursor: pointer; }
.template-item.active { border-color: #409eff; background: #f0f7ff; }
.template-item:focus-visible { outline: 2px solid #409eff; outline-offset: 2px; }
.t-name { font-weight: 600; font-size: 13px; }
.t-subject { font-size: 12px; color: #909399; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.candidate-note { margin-left: 10px; font-size: 12px; color: #67c23a; }
.body-hint { font-size: 12px; color: #909399; margin-bottom: 6px; line-height: 1.5; }
.var-code { font-family: Consolas, monospace; background: #f4f4f5; border-radius: 3px; padding: 0 4px; color: #409eff; }

/* 客户回信 */
.reply-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.reply-note { font-size: 12px; color: #909399; }
.reply-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}
.reply-item:hover { border-color: #409eff; background: #f8fbff; }
.reply-item.unread { border-color: #f56c6c; background: #fef8f7; }
.reply-item:focus-visible { outline: 2px solid #409eff; outline-offset: 2px; }
.reply-head { display: flex; align-items: center; gap: 8px; }
.reply-from { font-weight: 600; font-size: 14px; color: #1f2937; }
.reply-company { font-size: 12px; color: #409eff; background: #ecf5ff; border-radius: 4px; padding: 1px 6px; }
.reply-time { margin-left: auto; font-size: 12px; color: #909399; flex-shrink: 0; }
.reply-subject { font-size: 13px; color: #374151; margin-top: 6px; font-weight: 500; }
.reply-snippet { font-size: 12px; color: #909399; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.reply-detail .rd-row { font-size: 13px; color: #374151; margin-bottom: 8px; word-break: break-all; }
.reply-detail .rd-label { display: inline-block; width: 52px; color: #909399; margin-right: 8px; }
.rd-body {
  margin-top: 12px;
  padding: 12px 14px;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: #1f2937;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow-y: auto;
}

/* 投递明细时间线 */
.tl { margin: 18px 0 0 10px; border-left: 2px solid #e5e7eb; padding-left: 22px; }
.tl-item { position: relative; padding-bottom: 20px; }
.tl-item:last-child { padding-bottom: 0; }
.tl-dot {
  position: absolute; left: -29px; top: 3px;
  width: 10px; height: 10px; border-radius: 50%;
  background: #dcdfe6; border: 2px solid #fff; box-shadow: 0 0 0 1px #e5e7eb;
}
.tl-dot.done { background: #409eff; box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.15); }
.tl-title { font-size: 13px; color: #1f2937; font-weight: 600; }
.tl-item.muted .tl-title { color: #c0c4cc; }
.tl-time { font-size: 12px; color: #909399; margin-top: 2px; }
.tl-item.muted .tl-time { color: #d7dade; }
</style>
