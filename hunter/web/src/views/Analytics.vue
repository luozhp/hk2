<template>
  <div v-loading="loading">
    <!-- KPI 摘要卡（首屏速览，卡片化） -->
    <div class="stat-grid">
      <div v-for="c in statCards" :key="c.key" class="stat-card">
        <div class="stat-icon" :style="{ background: c.bg, color: c.color }">
          <el-icon :size="20"><component :is="c.icon" /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value" :style="{ color: c.color }">{{ c.value }}<span class="stat-unit">{{ c.unit }}</span></div>
          <div class="stat-label">{{ c.label }}</div>
          <div class="stat-sub" :title="c.sub">{{ c.sub }}</div>
        </div>
      </div>
    </div>

    <!-- 图表卡 · 第一行 -->
    <el-row :gutter="16">
      <el-col :xs="24" :md="8">
        <section class="panel-card">
          <header class="panel-head">
            <div class="panel-title">
              <span class="panel-badge badge-blue"><el-icon><Message /></el-icon></span>
              <div class="panel-titles">
                <div class="panel-name">邮件漏斗</div>
                <div class="panel-desc">发送 → 送达 → 打开 → 回复 → 成单</div>
              </div>
            </div>
            <el-tag size="small" type="success" effect="light" round v-if="mailOpenRate > 0">打开率 {{ mailOpenRate }}%</el-tag>
          </header>
          <ul v-if="mailTotal > 0" class="lead-list">
            <li v-for="d in mailRows" :key="d.name" class="lead-item">
              <span class="lead-item-fill" :style="{ width: d.width + '%', background: d.color }"></span>
              <span class="lead-dot" :style="{ background: d.color }"></span>
              <span class="lead-name" :title="d.label">{{ d.label }}</span>
              <span class="lead-count">{{ d.value }}</span>
              <span class="lead-pct">{{ d.percent }}%</span>
            </li>
          </ul>
          <div v-else class="chart-box">
            <el-empty description="暂无邮件数据" :image-size="72" class="chart-empty" />
          </div>
        </section>
      </el-col>

      <el-col :xs="24" :md="8">
        <section class="panel-card">
          <header class="panel-head">
            <div class="panel-title">
              <span class="panel-badge badge-green"><el-icon><TrendCharts /></el-icon></span>
              <div class="panel-titles">
                <div class="panel-name">转化漏斗</div>
                <div class="panel-desc">线索 → 客户 → 询盘 → 商机 → 成交</div>
              </div>
            </div>
            <el-tag size="small" type="primary" effect="light" round v-if="convWonRate > 0">成交率 {{ convWonRate }}%</el-tag>
          </header>
          <ul v-if="convTotal > 0" class="lead-list">
            <li v-for="d in convRows" :key="d.name" class="lead-item">
              <span class="lead-item-fill" :style="{ width: d.width + '%', background: d.color }"></span>
              <span class="lead-dot" :style="{ background: d.color }"></span>
              <span class="lead-name" :title="d.label">{{ d.label }}</span>
              <span class="lead-count">{{ d.value }}</span>
              <span class="lead-pct">{{ d.percent }}%</span>
            </li>
          </ul>
          <div v-else class="chart-box">
            <el-empty description="暂无转化数据" :image-size="72" class="chart-empty" />
          </div>
        </section>
      </el-col>

      <el-col :xs="24" :md="8">
        <section class="panel-card">
          <header class="panel-head">
            <div class="panel-title">
              <span class="panel-badge badge-orange"><el-icon><Share /></el-icon></span>
              <div class="panel-titles">
                <div class="panel-name">渠道贡献</div>
                <div class="panel-desc">各获客渠道的客户占比</div>
              </div>
            </div>
            <el-tag size="small" type="info" effect="light" round>{{ channelCount }} 个来源</el-tag>
          </header>
          <ul v-if="chChannelTotal > 0" class="lead-list">
            <li v-for="d in channelRows" :key="d.name" class="lead-item">
              <span class="lead-item-fill" :style="{ width: d.width + '%', background: d.color }"></span>
              <span class="lead-dot" :style="{ background: d.color }"></span>
              <span class="lead-name" :title="d.label">{{ d.label }}</span>
              <span class="lead-count">{{ d.value }}</span>
              <span class="lead-pct">{{ d.percent }}%</span>
            </li>
          </ul>
          <div v-else class="chart-box">
            <el-empty description="暂无渠道数据" :image-size="72" class="chart-empty" />
          </div>
        </section>
      </el-col>
    </el-row>

    <!-- 图表卡 · 第二行 -->
    <el-row :gutter="16" class="row-gap">
      <el-col :xs="24" :md="8">
        <section class="panel-card">
          <header class="panel-head">
            <div class="panel-title">
              <span class="panel-badge badge-indigo"><el-icon><DataAnalysis /></el-icon></span>
              <div class="panel-titles">
                <div class="panel-name">KPI 对照</div>
                <div class="panel-desc">关键指标 vs 行业基准</div>
              </div>
            </div>
          </header>
          <ul class="lead-list">
            <li v-for="k in kpiRows" :key="k.name" class="lead-item">
              <span class="lead-item-fill" :style="{ width: k.width + '%', background: k.color }"></span>
              <span class="lead-dot" :style="{ background: k.color }"></span>
              <span class="lead-name" :title="k.desc">{{ k.name }}</span>
              <span class="lead-count">{{ k.value }}</span>
              <span class="lead-pct">{{ k.percent }}%</span>
            </li>
          </ul>
        </section>
      </el-col>

      <el-col :xs="24" :md="16">
        <section class="panel-card">
          <header class="panel-head">
            <div class="panel-title">
              <span class="panel-badge badge-violet"><el-icon><Connection /></el-icon></span>
              <div class="panel-titles">
                <div class="panel-name">线索渠道分布</div>
                <div class="panel-desc">各来源线索数量与占比</div>
              </div>
            </div>
          </header>
          <ul v-if="chLeadTotal > 0" class="lead-list">
            <li v-for="d in leadChannels" :key="d.name" class="lead-item">
              <span class="lead-item-fill" :style="{ width: d.width + '%', background: d.color }"></span>
              <span class="lead-dot" :style="{ background: d.color }"></span>
              <span class="lead-name" :title="d.label">{{ d.label }}</span>
              <span class="lead-count">{{ d.value }}</span>
              <span class="lead-pct">{{ d.percent }}%</span>
            </li>
          </ul>
          <div v-else class="chart-box">
            <el-empty description="暂无线索数据" :image-size="72" class="chart-empty chart-empty-sm" />
          </div>
        </section>
      </el-col>
    </el-row>

    <!-- KPI 跟踪表（卡片化） -->
    <section class="panel-card panel-card--table">
      <header class="panel-head">
        <div class="panel-title">
          <span class="panel-badge badge-slate"><el-icon><List /></el-icon></span>
          <div class="panel-titles">
            <div class="panel-name">KPI 跟踪表</div>
            <div class="panel-desc">指标定义与参考基准</div>
          </div>
        </div>
        <el-tag size="small" type="info" effect="plain">产品文档 §10</el-tag>
      </header>
      <el-table :data="kpiTable" size="small" stripe>
        <el-table-column prop="metric" label="指标" min-width="220" />
        <el-table-column prop="definition" label="定义" min-width="240" />
        <el-table-column prop="current" label="当前" width="110" />
        <el-table-column prop="target" label="参考基准" width="130" />
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import api, { dict } from '../api';

const loading = ref(false);

const kpi = ref<any>({
  replyRate: 0,
  industryBenchmark: '3% - 8%',
  avgCycleDays: null,
  cycleSampleSize: 0,
  activeCustomers: 0,
  targetCustomers: 20,
  inquiryTotal: 0,
  onlineInquiries: 0,
  offlineInquiries: 0,
  conversionRate: 0,
  conversionAdvanced: 0,
});
const funnelData = ref<any>({ mail: {}, conversion: {} });
const channels = ref<any>({});

// —— 渠道 key → 中文名（复用来源字典，未知 key 原样返回）——
const SOURCE_CN: Record<string, string> = Object.fromEntries(dict.source.map((s) => [s.value, s.label]));
const cnSource = (v: string) => SOURCE_CN[v] || v;

// —— 摘要结论：图讲结构，标签给结论 ——
const mailOpenRate = computed(() => {
  const m = funnelData.value.mail || {};
  return m.sent ? Math.round((m.opened / m.sent) * 100) : 0;
});
const convWonRate = computed(() => {
  const c = funnelData.value.conversion || {};
  return c.leads ? Math.round((c.won / c.leads) * 100) : 0;
});
const channelCount = computed(() => Object.keys(channels.value.companies || {}).length);
const mailTotal = computed(() => {
  const m = funnelData.value.mail || {};
  return (m.sent || 0) + (m.delivered || 0) + (m.opened || 0) + (m.replied || 0) + (m.won || 0);
});
const convTotal = computed(() => {
  const c = funnelData.value.conversion || {};
  return (c.leads || 0) + (c.converted || 0) + (c.inquiries || 0) + (c.opportunities || 0) + (c.won || 0);
});
const chChannelTotal = computed(() => {
  const comp = (channels.value.companies || {}) as Record<string, unknown>;
  let t = 0;
  Object.values(comp).forEach((v) => { t += Number(v) || 0; });
  return t;
});
const chLeadTotal = computed(() => {
  const leads = (channels.value.leads || {}) as Record<string, unknown>;
  let t = 0;
  Object.values(leads).forEach((v) => { t += Number(v) || 0; });
  return t;
});

// —— KPI 对照诊断 ——
const replyBarPct = computed(() => Math.min(100, Math.round((kpi.value.replyRate / 8) * 100)));
const activePct = computed(() =>
  kpi.value.targetCustomers ? Math.min(100, Math.round((kpi.value.activeCustomers / kpi.value.targetCustomers) * 100)) : 0,
);
const cyclePct = computed(() => Math.min(100, Math.round(((kpi.value.avgCycleDays ?? 0) / 180) * 100)));

// —— KPI 摘要卡：把最关键的 5 个结果指标前置为卡片，一眼看到结果 ——
const statCards = computed(() => {
  const k = kpi.value;
  return [
    {
      key: 'inquiry', label: '询盘量', value: k.inquiryTotal ?? 0, unit: ' 条',
      sub: `线上 ${k.onlineInquiries ?? 0} · 线下 ${k.offlineInquiries ?? 0}`,
      icon: 'ChatDotRound', color: '#409eff', bg: 'linear-gradient(135deg,#ecf5ff,#d9ecff)',
    },
    {
      key: 'conversion', label: '询盘转化率', value: k.conversionRate ?? 0, unit: '%',
      sub: `进阶商机 ${k.conversionAdvanced ?? 0} 个`,
      icon: 'TrendCharts', color: '#e6a23c', bg: 'linear-gradient(135deg,#fdf6ec,#faecd8)',
    },
    {
      key: 'reply', label: '开发信回复率', value: k.replyRate ?? 0, unit: '%',
      sub: `行业基准 ${k.industryBenchmark}`,
      icon: 'Message', color: '#67c23a', bg: 'linear-gradient(135deg,#f0f9eb,#e1f3d8)',
    },
    {
      key: 'customers', label: '有效客户', value: k.activeCustomers ?? 0, unit: ` / ${k.targetCustomers ?? 20}`,
      sub: '2028 目标进度',
      icon: 'OfficeBuilding', color: '#8b5cf6', bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)',
    },
    {
      key: 'cycle', label: '平均成交周期', value: k.avgCycleDays == null ? '—' : k.avgCycleDays,
      unit: k.avgCycleDays == null ? '' : ' 天',
      sub: k.cycleSampleSize ? `${k.cycleSampleSize} 个成交样本` : '暂无成交样本',
      icon: 'Clock', color: '#f56c6c', bg: 'linear-gradient(135deg,#fef0f0,#fde2e2)',
    },
  ];
});

const kpiTable = computed(() => [
  { metric: '独立站自然流量（月 UV 中自然搜索占比）', definition: '季度环比增长（需接入 GA / GSC）', current: '—', target: '环比 +20%' },
  {
    metric: '询盘量',
    definition: `表单 + 邮箱询盘（线上 ${kpi.value.onlineInquiries ?? 0} + 线下基数 ${kpi.value.offlineInquiries ?? 0}）`,
    current: (kpi.value.inquiryTotal ?? 0) + ' 条',
    target: '2026 ≥ 100 条',
  },
  {
    metric: '询盘转化率',
    definition: `进入样品/报价阶段的商机 ${kpi.value.conversionAdvanced ?? 0} ÷ 询盘总数`,
    current: (kpi.value.conversionRate ?? 0) + '%',
    target: '≥ 30%',
  },
  { metric: '开发信回复率', definition: '回复数 / 发送数', current: kpi.value.replyRate + '%', target: '3%–8%（行业正常水平）' },
  {
    metric: '线索→成交周期',
    definition: kpi.value.cycleSampleSize ? `首次触达 → 首单（${kpi.value.cycleSampleSize} 个成交样本均值）` : '首次触达 → 首单（暂无成交样本）',
    current: kpi.value.avgCycleDays ? '约 ' + kpi.value.avgCycleDays + ' 天' : '—',
    target: '3–6 个月',
  },
  { metric: '有效客户数', definition: '成交客户累计', current: String(kpi.value.activeCustomers), target: '2028 ≥ 20 家活跃客户' },
]);

// —— 榜单配色（延续工作台视觉语言）——
const PALETTE = ['#409eff', '#4facfe', '#34d399', '#e6a23c', '#f56c6c'];

// —— KPI 对照：三项指标转为榜单行（当前值 + 达成率 + 占比条）——
const kpiRows = computed(() => [
  {
    name: '开发信回复率', value: kpi.value.replyRate + '%',
    percent: replyBarPct.value, width: replyBarPct.value,
    color: PALETTE[0], desc: `行业基准 ${kpi.value.industryBenchmark}`,
  },
  {
    name: '活跃客户', value: `${kpi.value.activeCustomers} / ${kpi.value.targetCustomers}`,
    percent: activePct.value, width: activePct.value,
    color: PALETTE[2], desc: '2028 目标进度',
  },
  {
    name: '平均成交周期',
    value: kpi.value.avgCycleDays == null ? '—' : kpi.value.avgCycleDays + ' 天',
    percent: cyclePct.value, width: cyclePct.value,
    color: PALETTE[3], desc: '首次触达 → 首单（目标 ≤ 180 天）',
  },
]);

// —— 通用榜单：把一组「名称/数量」转为排行榜行（含占比、颜色、占比条宽度）——
const makeRows = (
  items: { name: string; value: number }[],
  opts: { sortDesc?: boolean; baseOnFirst?: boolean; filterZero?: boolean } = {},
) => {
  let list = items.map((d) => ({ name: d.name, value: Number(d.value) || 0 }));
  if (opts.filterZero) list = list.filter((d) => d.value > 0);
  if (opts.sortDesc) list = list.slice().sort((a, b) => b.value - a.value);
  const sum = list.reduce((s, d) => s + d.value, 0);
  const max = Math.max(1, ...list.map((d) => d.value));
  const base = opts.baseOnFirst ? (list[0]?.value || 1) : (sum || 1);
  return list.map((d, i) => ({
    name: d.name,
    label: cnSource(d.name),
    value: d.value,
    percent: base ? Math.round((d.value / base) * 1000) / 10 : 0,
    width: Math.round((d.value / max) * 100),
    color: PALETTE[i % PALETTE.length],
  }));
};

// 邮件漏斗 / 转化漏斗：保持层级顺序，百分比以首层为基准（即留存率）
const mailRows = computed(() => makeRows([
  { name: '发送', value: funnelData.value.mail?.sent || 0 },
  { name: '送达', value: funnelData.value.mail?.delivered || 0 },
  { name: '打开', value: funnelData.value.mail?.opened || 0 },
  { name: '回复', value: funnelData.value.mail?.replied || 0 },
  { name: '成单', value: funnelData.value.mail?.won || 0 },
], { baseOnFirst: true }));

const convRows = computed(() => makeRows([
  { name: '线索', value: funnelData.value.conversion?.leads || 0 },
  { name: '转客户', value: funnelData.value.conversion?.converted || 0 },
  { name: '询盘', value: funnelData.value.conversion?.inquiries || 0 },
  { name: '商机', value: funnelData.value.conversion?.opportunities || 0 },
  { name: '成交', value: funnelData.value.conversion?.won || 0 },
], { baseOnFirst: true }));

// 渠道贡献 / 线索渠道分布：按数量降序，百分比以总量为基准
const channelRows = computed(() => makeRows(
  Object.entries(channels.value.companies || {}).map(([name, v]) => ({ name, value: Number(v) || 0 })),
  { sortDesc: true, filterZero: true },
));

const leadChannels = computed(() => makeRows(
  Object.entries(channels.value.leads || {}).map(([name, v]) => ({ name, value: Number(v) || 0 })),
  { sortDesc: true, filterZero: true },
));

onMounted(async () => {
  loading.value = true;
  try {
    // 三个接口互不依赖，并行请求（原为串行，耗时约为原来的 3 倍）
    const [funnel, ch, k] = await Promise.all([
      api.analytics.funnel(),
      api.analytics.channels(),
      api.analytics.kpi(),
    ]);
    funnelData.value = funnel;
    channels.value = ch;
    kpi.value = k;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
/* ---------- KPI 摘要卡（首屏速览） ---------- */
.stat-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 16px; }
.stat-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px;
  border: 1px solid #eef0f3;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 26px rgba(15, 23, 42, 0.1); }
.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-info { min-width: 0; }
.stat-value { font-size: 24px; font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; }
.stat-unit { font-size: 13px; font-weight: 600; color: #c0c4cc; margin-left: 2px; }
.stat-label { font-size: 13px; color: #6b7280; margin-top: 5px; }
.stat-sub { font-size: 11px; color: #c0c4cc; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ---------- 图表卡片（统一卡片外壳） ---------- */
.row-gap { margin-top: 16px; }
.panel-card {
  height: 100%;
  box-sizing: border-box;
  padding: 16px 18px 18px;
  border: 1px solid #eef1f5;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.panel-card:hover {
  transform: translateY(-3px);
  border-color: #e2e8f0;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.1);
}
.panel-card--table { margin-top: 16px; }

.panel-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
.panel-title { display: flex; align-items: center; gap: 12px; min-width: 0; }
.panel-badge {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.badge-blue   { background: linear-gradient(135deg, #ecf5ff, #d9ecff); color: #409eff; }
.badge-green  { background: linear-gradient(135deg, #f0f9eb, #e1f3d8); color: #67c23a; }
.badge-orange { background: linear-gradient(135deg, #fdf6ec, #faecd8); color: #e6a23c; }
.badge-violet { background: linear-gradient(135deg, #f5f3ff, #ede9fe); color: #8b5cf6; }
.badge-indigo { background: linear-gradient(135deg, #eef2ff, #e0e7ff); color: #6366f1; }
.badge-slate  { background: linear-gradient(135deg, #f1f5f9, #e2e8f0); color: #475569; }
.panel-titles { min-width: 0; }
.panel-name { font-size: 14px; font-weight: 700; color: #1f2937; line-height: 1.2; }
.panel-desc { font-size: 11px; color: #a0a6b1; margin-top: 3px; }

.chart-box {
  background: linear-gradient(180deg, #fbfcfe, #f5f8fc);
  border-radius: 12px;
  padding: 8px;
}
.chart-empty { height: 248px; }
.chart-empty-sm { height: 208px; }

/* 渠道 / 漏斗榜单 */
.lead-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.lead-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  overflow: hidden;
  font-size: 12.5px;
}
.lead-item-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  opacity: 0.13;
  border-radius: 9px;
  transition: width 0.5s ease;
}
.lead-dot { position: relative; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.lead-name { position: relative; flex: 1; min-width: 0; color: #4b5563; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lead-count { position: relative; font-weight: 700; color: #1f2937; font-variant-numeric: tabular-nums; }
.lead-pct { position: relative; width: 48px; text-align: right; color: #9ca3af; font-variant-numeric: tabular-nums; }

/* 表格表头 / 斑马纹 / 行 hover */
:deep(.el-table) { --el-table-border-color: transparent; background: transparent; }
:deep(.el-table tr),
:deep(.el-table th.el-table__cell) { background: transparent; }
:deep(.el-table th.el-table__cell) { background: #f8fafc; color: #64748b; font-weight: 600; }
:deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) { background: #f8fafc; }
:deep(.el-table tbody tr:hover > td.el-table__cell) { background: #eef6ff; }
:deep(.el-table .el-table__cell) { padding: 10px 0; }

@media (max-width: 1100px) {
  .stat-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 640px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .lead-item-fill { transition: none; }
  .stat-card { transition: none; }
  .stat-card:hover { transform: none; }
  .panel-card { transition: none; }
  .panel-card:hover { transform: none; }
}
</style>
