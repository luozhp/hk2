<template>
  <div>
    <el-row :gutter="16">
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>邮件漏斗</template>
          <div ref="mailChart" style="height:260px"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>转化漏斗（线索→成交）</template>
          <div ref="convChart" style="height:260px"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>渠道贡献</template>
          <div ref="chChannelChart" style="height:260px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:16px">
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>KPI 对照</template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="开发信回复率">
              <b :style="{ color: kpi.replyRate >= 3 ? '#67c23a' : '#e6a23c' }">{{ kpi.replyRate }}%</b>
              <span style="margin-left:8px;font-size:12px;color:#909399">行业基准 {{ kpi.industryBenchmark }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="平均成交周期">约 {{ kpi.avgCycleDays }} 天</el-descriptions-item>
            <el-descriptions-item label="活跃客户">
              <b>{{ kpi.activeCustomers }}</b> / 目标 {{ kpi.targetCustomers }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :span="16">
        <el-card shadow="never">
          <template #header>线索渠道分布</template>
          <div ref="chLeadChart" style="height:220px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-top:16px">
      <template #header>KPI 跟踪表（对照产品文档 §10）</template>
      <el-table :data="kpiTable" size="small">
        <el-table-column prop="metric" label="指标" min-width="200" />
        <el-table-column prop="definition" label="定义" min-width="260" />
        <el-table-column prop="current" label="当前" width="90" />
        <el-table-column prop="target" label="参考基准" width="110" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';
import api from '../api';

const mailChart = ref<HTMLElement>();
const convChart = ref<HTMLElement>();
const chChannelChart = ref<HTMLElement>();
const chLeadChart = ref<HTMLElement>();
const kpi = ref<any>({ replyRate: 0, industryBenchmark: '3% - 8%', avgCycleDays: 0, activeCustomers: 0, targetCustomers: 20 });

const kpiTable = ref([
  { metric: '独立站自然流量（月 UV 中自然搜索占比）', definition: '季度环比增长', current: '—', target: '环比 +20%' },
  { metric: '询盘量', definition: '表单 + 邮箱询盘总数', current: '14', target: '2026 ≥ 100 条' },
  { metric: '询盘转化率', definition: '询盘 → 样品/报价客户', current: '—', target: '≥ 30%' },
  { metric: '开发信回复率', definition: '回复数 / 发送数', current: kpi.value.replyRate + '%', target: '3%–8%（行业正常水平）' },
  { metric: '线索→成交周期', definition: '首次触达到首单', current: '约 42 天', target: '3–6 个月' },
  { metric: '有效客户数', definition: '成交客户累计', current: kpi.value.activeCustomers, target: '2028 ≥ 20 家活跃客户' },
]);

let charts: echarts.ECharts[] = [];

const funnelOption = (data: any[]) => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c}' },
  series: [{
    type: 'funnel',
    left: '10%', width: '80%',
    minSize: '20%',
    sort: 'descending',
    gap: 2,
    label: { formatter: '{b} {c}' },
    itemStyle: { borderColor: '#fff', borderWidth: 1 },
    data,
  }],
});

const pieOption = (data: any[]) => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, textStyle: { fontSize: 11 } },
  series: [{ type: 'pie', radius: ['35%', '62%'], center: ['50%', '45%'], itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 1 }, data }],
});

const render = () => {
  charts.forEach((c) => c.dispose());
  charts = [];
  if (mailChart.value) {
    const c = echarts.init(mailChart.value);
    const funnel = funnelData.value.mail;
    c.setOption(funnelOption([
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
    c.setOption(funnelOption([
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

const funnelData = ref<any>({ mail: {}, conversion: {} });
const channels = ref<any>({});

const resize = () => charts.forEach((c) => c.resize());

onMounted(async () => {
  funnelData.value = await api.analytics.funnel();
  channels.value = await api.analytics.channels();
  kpi.value = await api.analytics.kpi();
  render();
  window.addEventListener('resize', resize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize);
  charts.forEach((c) => c.dispose());
});
</script>
