<template>
  <div v-loading="loading">
    <!-- 漏斗与渠道 -->
    <el-row :gutter="16">
      <el-col :xs="24" :md="8">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-head">
              <div class="panel-title">
                <el-icon class="panel-icon"><Message /></el-icon>
                <span>邮件漏斗</span>
              </div>
              <el-tag size="small" type="success" effect="light" round v-if="mailOpenRate > 0">打开率 {{ mailOpenRate }}%</el-tag>
            </div>
          </template>
          <div v-if="mailTotal > 0" ref="mailChart" style="height:260px"></div>
          <el-empty v-else description="暂无邮件数据" :image-size="72" style="height:260px" />
        </el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-head">
              <div class="panel-title">
                <el-icon class="panel-icon"><TrendCharts /></el-icon>
                <span>转化漏斗（线索→成交）</span>
              </div>
              <el-tag size="small" type="primary" effect="light" round v-if="convWonRate > 0">成交率 {{ convWonRate }}%</el-tag>
            </div>
          </template>
          <div v-if="convTotal > 0" ref="convChart" style="height:260px"></div>
          <el-empty v-else description="暂无转化数据" :image-size="72" style="height:260px" />
        </el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-head">
              <div class="panel-title">
                <el-icon class="panel-icon"><Share /></el-icon>
                <span>渠道贡献</span>
              </div>
              <el-tag size="small" type="info" effect="light" round>{{ channelCount }} 个来源</el-tag>
            </div>
          </template>
          <div v-if="chChannelTotal > 0" ref="chChannelChart" style="height:260px"></div>
          <el-empty v-else description="暂无渠道数据" :image-size="72" style="height:260px" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:16px">
      <!-- KPI 对照（诊断行） -->
      <el-col :xs="24" :md="8">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-head">
              <div class="panel-title">
                <el-icon class="panel-icon"><DataAnalysis /></el-icon>
                <span>KPI 对照</span>
              </div>
            </div>
          </template>
          <div class="kpi-list">
            <div class="kpi-row">
              <div class="kpi-row-top">
                <span class="kpi-label">开发信回复率</span>
                <span class="kpi-value" :class="replyOk ? 'is-ok' : 'is-warn'">{{ kpi.replyRate }}%</span>
              </div>
              <div class="kpi-sub">行业基准 {{ kpi.industryBenchmark }}</div>
              <div class="kpi-bar">
                <div class="kpi-bar-fill" :class="replyOk ? 'fill-green' : 'fill-orange'" :style="{ width: replyBarPct + '%' }"></div>
              </div>
            </div>
            <div class="kpi-row">
              <div class="kpi-row-top">
                <span class="kpi-label">活跃客户</span>
                <span class="kpi-value">{{ kpi.activeCustomers }}<span class="kpi-unit"> / {{ kpi.targetCustomers }}</span></span>
              </div>
              <div class="kpi-sub">2028 目标进度</div>
              <div class="kpi-bar">
                <div class="kpi-bar-fill fill-blue" :style="{ width: activePct + '%' }"></div>
              </div>
            </div>
            <div class="kpi-row">
              <div class="kpi-row-top">
                <span class="kpi-label">平均成交周期</span>
                <span class="kpi-value">{{ kpi.avgCycleDays }}<span class="kpi-unit"> 天</span></span>
              </div>
              <div class="kpi-sub">首次触达 → 首单（目标 ≤ 180 天）</div>
              <div class="kpi-bar">
                <div class="kpi-bar-fill fill-violet" :style="{ width: cyclePct + '%' }"></div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <!-- 线索渠道分布 -->
      <el-col :xs="24" :md="16">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-head">
              <div class="panel-title">
                <el-icon class="panel-icon"><Connection /></el-icon>
                <span>线索渠道分布</span>
              </div>
            </div>
          </template>
          <div v-if="chLeadTotal > 0" ref="chLeadChart" style="height:220px"></div>
          <el-empty v-else description="暂无线索数据" :image-size="72" style="height:220px" />
        </el-card>
      </el-col>
    </el-row>

    <!-- KPI 跟踪表 -->
    <el-card shadow="never" class="panel-card" style="margin-top:16px">
      <template #header>
        <div class="panel-head">
          <div class="panel-title">
            <el-icon class="panel-icon"><List /></el-icon>
            <span>KPI 跟踪表</span>
          </div>
          <el-tag size="small" type="info" effect="plain">产品文档 §10</el-tag>
        </div>
      </template>
      <el-table :data="kpiTable" size="small" stripe>
        <el-table-column prop="metric" label="指标" min-width="220" />
        <el-table-column prop="definition" label="定义" min-width="240" />
        <el-table-column prop="current" label="当前" width="110" />
        <el-table-column prop="target" label="参考基准" width="130" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';
import api from '../api';

const loading = ref(false);
const mailChart = ref<HTMLElement>();
const convChart = ref<HTMLElement>();
const chChannelChart = ref<HTMLElement>();
const chLeadChart = ref<HTMLElement>();

const kpi = ref<any>({ replyRate: 0, industryBenchmark: '3% - 8%', avgCycleDays: 0, activeCustomers: 0, targetCustomers: 20 });
const funnelData = ref<any>({ mail: {}, conversion: {} });
const channels = ref<any>({});

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
const replyOk = computed(() => kpi.value.replyRate >= 3);
const replyBarPct = computed(() => Math.min(100, Math.round((kpi.value.replyRate / 8) * 100)));
const activePct = computed(() =>
  kpi.value.targetCustomers ? Math.min(100, Math.round((kpi.value.activeCustomers / kpi.value.targetCustomers) * 100)) : 0,
);
const cyclePct = computed(() => Math.min(100, Math.round((kpi.value.avgCycleDays / 180) * 100)));

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

// —— 品牌色板与图表样式（延续工作台视觉语言）——
const PALETTE = ['#409eff', '#4facfe', '#34d399', '#e6a23c', '#f56c6c'];
const DARK_TOOLTIP = { backgroundColor: 'rgba(15,23,42,.92)', borderWidth: 0, textStyle: { color: '#fff' } };

let charts: echarts.ECharts[] = [];

// 留存条形图：每层一条水平条，长度即留存数，自上而下逐层收窄
const barOption = (data: any[]) => {
  const total = data[0]?.value || 1;
  const last = data.length - 1;
  return {
    color: PALETTE,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      ...DARK_TOOLTIP,
      formatter: (p: any[]) => `${p[0].name}<br/>${p[0].value} 条（${Math.round((p[0].value / total) * 100)}%）`,
    },
    grid: { left: 8, right: 64, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      data: data.map((d) => d.name),
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#6b7280', fontSize: 12 },
    },
    series: [{
      type: 'bar',
      barWidth: 14,
      data: data.map((d, i) => ({
        value: d.value,
        itemStyle: {
          borderRadius: [0, 7, 7, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: i === last ? '#409eff' : '#4facfe' },
            { offset: 1, color: i === last ? '#00c6ff' : '#79c4fe' },
          ]),
        },
        label: {
          show: true,
          position: 'right',
          color: i === last ? '#409eff' : '#1f2937',
          fontWeight: i === last ? 700 : 600,
          fontSize: 12,
          formatter: (p: any) => {
            const pct = Math.round((p.value / total) * 100);
            return `${p.value} · ${pct}%`;
          },
        },
      })),
    }],
  };
};

const pieOption = (data: any[]) => ({
  color: PALETTE,
  tooltip: { trigger: 'item', ...DARK_TOOLTIP },
  legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: '#6b7280', fontSize: 11 } },
  series: [{
    type: 'pie', radius: ['38%', '64%'], center: ['50%', '44%'],
    itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
    label: { show: false },
    emphasis: { label: { show: true, formatter: '{b}\n{c} 条（{d}%）', fontSize: 12, color: '#1f2937' } },
    data,
  }],
});

const render = () => {
  charts.forEach((c) => c.dispose());
  charts = [];
  if (mailChart.value) {
    const c = echarts.init(mailChart.value);
    const funnel = funnelData.value.mail;
    c.setOption(barOption([
      { name: '发送', value: funnel.sent },
      { name: '送达', value: funnel.delivered },
      { name: '打开', value: funnel.opened },
      { name: '回复', value: funnel.replied },
      { name: '成单', value: funnel.won },
    ]));
    charts.push(c);
  }
  if (convChart.value) {
    const c = echarts.init(convChart.value);
    const cv = funnelData.value.conversion;
    c.setOption(barOption([
      { name: '线索', value: cv.leads },
      { name: '转客户', value: cv.converted },
      { name: '询盘', value: cv.inquiries },
      { name: '商机', value: cv.opportunities },
      { name: '成交', value: cv.won },
    ]));
    charts.push(c);
  }
  if (chChannelChart.value) {
    const c = echarts.init(chChannelChart.value);
    const comp = channels.value.companies || {};
    c.setOption(pieOption(Object.entries(comp).map(([name, v]) => ({ name, value: v }))));
    charts.push(c);
  }
  if (chLeadChart.value) {
    const c = echarts.init(chLeadChart.value);
    const leads = channels.value.leads || {};
    c.setOption(pieOption(Object.entries(leads).map(([name, v]) => ({ name, value: v }))));
    charts.push(c);
  }
};

const resize = () => charts.forEach((c) => c.resize());

onMounted(async () => {
  loading.value = true;
  try {
    funnelData.value = await api.analytics.funnel();
    channels.value = await api.analytics.channels();
    kpi.value = await api.analytics.kpi();
  } finally {
    loading.value = false;
  }
  render();
  window.addEventListener('resize', resize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize);
  charts.forEach((c) => c.dispose());
});
</script>

<style scoped>
/* 面板卡片统一（12px 圆角，延续工作台视觉语言） */
.panel-card { border-radius: 12px; transition: box-shadow 0.25s ease; }
.panel-card:hover { box-shadow: 0 10px 28px rgba(15, 23, 42, 0.1); }
.panel-head { display: flex; justify-content: space-between; align-items: center; }
.panel-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #1f2937; }
.panel-icon { color: #409eff; font-size: 16px; }

/* KPI 诊断行 */
.kpi-list { display: flex; flex-direction: column; gap: 20px; }
.kpi-row-top { display: flex; justify-content: space-between; align-items: baseline; }
.kpi-label { font-size: 13px; color: #6b7280; }
.kpi-value { font-size: 22px; font-weight: 700; color: #1f2937; font-variant-numeric: tabular-nums; }
.kpi-value.is-ok { color: #16a34a; }
.kpi-value.is-warn { color: #d97706; }
.kpi-unit { font-size: 13px; color: #c0c4cc; font-weight: 400; margin-left: 2px; }
.kpi-sub { font-size: 12px; color: #c0c4cc; margin-top: 4px; }
.kpi-bar { height: 6px; border-radius: 3px; background: #f1f5f9; margin-top: 8px; overflow: hidden; }
.kpi-bar-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
.fill-green { background: linear-gradient(90deg, #34d399, #a3e635); }
.fill-orange { background: linear-gradient(90deg, #e6a23c, #f59e0b); }
.fill-blue { background: linear-gradient(90deg, #409eff, #00c6ff); }
.fill-violet { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }

/* 表格表头 / 斑马纹 / 行 hover */
:deep(.el-table th.el-table__cell) { background: #f8fafc; color: #64748b; font-weight: 600; }
:deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) { background: #f8fafc; }
:deep(.el-table tbody tr:hover > td.el-table__cell) { background: #eef6ff; }
:deep(.el-table .el-table__cell) { padding: 10px 0; }

@media (prefers-reduced-motion: reduce) {
  .kpi-bar-fill { transition: none; }
}
</style>
