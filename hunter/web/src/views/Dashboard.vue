<template>
  <div v-loading="loading">
    <!-- 目标进度 -->
    <el-row :gutter="16">
      <el-col :span="12">
        <el-card shadow="never" class="goal-card">
          <div class="goal-title">2026 询盘目标</div>
          <el-progress :percentage="goalRate1" :stroke-width="14" color="#409eff">
            <span class="goal-text">{{ goals.inquiry2026.current }} / {{ goals.inquiry2026.target }}</span>
          </el-progress>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never" class="goal-card">
          <div class="goal-title">2028 活跃客户目标</div>
          <el-progress :percentage="goalRate2" :stroke-width="14" color="#67c23a">
            <span class="goal-text">{{ goals.customer2028.current }} / {{ goals.customer2028.target }}</span>
          </el-progress>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据卡片 -->
    <el-row :gutter="16" style="margin-top:16px">
      <el-col :span="4" v-for="c in statCards" :key="c.label">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value" :style="{ color: c.color }">{{ c.value }}</div>
          <div class="stat-label">{{ c.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:16px">
      <!-- 待办任务 -->
      <el-col :span="10">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>任务与待办</span>
              <el-button link type="primary" @click="$router.push('/analytics')">查看目标</el-button>
            </div>
          </template>
          <el-timeline v-if="tasks.length">
            <el-timeline-item
              v-for="t in tasks" :key="t.id"
              :type="t.overdue ? 'danger' : t.status === 'done' ? 'success' : 'primary'"
              :timestamp="formatDate(t.dueDate) + (t.overdue ? '（已逾期）' : '')">
              <div class="task-item">
                <span>{{ t.title }}</span>
                <el-tag size="small" effect="plain">{{ t.category }}</el-tag>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无待办任务" :image-size="60" />
        </el-card>
      </el-col>

      <!-- 近7天邮件 -->
      <el-col :span="14">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>近 7 天邮件发送</span>
              <el-tag size="small" type="success">回复率 {{ overview.mail.replyRate }}%（行业 3-8%）</el-tag>
            </div>
          </template>
          <div ref="chartRef" style="height:260px"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';
import api from '../api';

const loading = ref(false);
const overview = ref<any>({ stats: {}, goals: { inquiry2026: { target: 100, current: 0 }, customer2028: { target: 20, current: 0 } }, mail: { week: [], replyRate: 0 }, tasks: [] });

const goals = computed(() => overview.value.goals);
const goalRate1 = computed(() => Math.min(100, Math.round((goals.value.inquiry2026.current / goals.value.inquiry2026.target) * 100)));
const goalRate2 = computed(() => Math.min(100, Math.round((goals.value.customer2028.current / goals.value.customer2028.target) * 100)));
const tasks = computed(() => overview.value.tasks || []);

const statCards = computed(() => {
  const s = overview.value.stats;
  return [
    { label: '有效线索', value: s.leads, color: '#409eff' },
    { label: '客户数', value: s.customers, color: '#67c23a' },
    { label: '询盘量', value: s.inquiries, color: '#e6a23c' },
    { label: '进行中商机', value: s.opportunities, color: '#f56c6c' },
    { label: '商机金额(USD)', value: '$' + (s.pipelineAmount / 1000).toFixed(0) + 'k', color: '#909399' },
  ];
});

const formatDate = (d: string) => {
  if (!d) return '';
  const date = new Date(d);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const chartRef = ref<HTMLElement>();
let chart: echarts.ECharts | null = null;

const renderChart = () => {
  if (!chartRef.value) return;
  chart = echarts.init(chartRef.value);
  const week = overview.value.mail.week || [];
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['发送', '回复'] },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: week.map((w: any) => w.day) },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { name: '发送', type: 'bar', data: week.map((w: any) => w.sent), itemStyle: { color: '#409eff', borderRadius: [4, 4, 0, 0] } },
      { name: '回复', type: 'line', data: week.map((w: any) => w.replied), itemStyle: { color: '#67c23a' }, smooth: true },
    ],
  });
};

const resize = () => chart && chart.resize();

onMounted(async () => {
  loading.value = true;
  overview.value = await api.dashboard.overview();
  loading.value = false;
  renderChart();
  window.addEventListener('resize', resize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize);
  chart?.dispose();
});
</script>

<style scoped>
.goal-card { background: linear-gradient(135deg, #f0f7ff, #fff); }
.goal-title { font-size: 14px; color: #606266; margin-bottom: 10px; }
.goal-text { font-size: 12px; }
.stat-card { text-align: center; }
.stat-value { font-size: 26px; font-weight: 700; }
.stat-label { font-size: 13px; color: #909399; margin-top: 4px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.task-item { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; }
</style>
