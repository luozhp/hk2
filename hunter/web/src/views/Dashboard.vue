<template>
  <div v-loading="loading">
    <!-- 增长仪表（签名主卡） -->
    <div class="goal-hero">
      <div class="goal-hero-main">
        <div class="goal-hero-head">
          <div class="goal-hero-eyebrow">2026 · 年度增长轨道</div>
          <span class="goal-hero-badge" :class="trackVerdict.cls">{{ trackVerdict.label }}</span>
        </div>
        <div class="goal-hero-value">{{ heroDisplay }}<span class="goal-hero-unit">%</span></div>
        <div class="goal-hero-caption">{{ trackVerdict.note }}</div>
      </div>
      <div class="goal-hero-bars">
        <div class="ghb-title">分项目标达成</div>
        <div class="goal-hero-bar">
          <div class="ghb-top">
            <span class="ghb-label">询盘目标</span>
            <span class="ghb-num">{{ goals.inquiry2026.current }} / {{ goals.inquiry2026.target }}</span>
          </div>
          <div class="ghb-track"><div class="ghb-fill" :style="{ width: goalRate1 + '%' }"></div></div>
        </div>
        <div class="goal-hero-bar">
          <div class="ghb-top">
            <span class="ghb-label">活跃客户</span>
            <span class="ghb-num">{{ goals.customer2028.current }} / {{ goals.customer2028.target }}</span>
          </div>
          <div class="ghb-track"><div class="ghb-fill ghb-fill-green" :style="{ width: goalRate2 + '%' }"></div></div>
        </div>
      </div>
    </div>

    <!-- 数据卡片（单行 5 等分） -->
    <div class="stat-grid">
      <div v-for="c in statCards" :key="c.label" class="stat-card">
        <div class="stat-icon" :style="{ background: c.bg, color: c.color }">
          <el-icon :size="18"><component :is="c.icon" /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value" :style="{ color: c.color }">{{ c.value }}</div>
          <div class="stat-label">{{ c.label }}</div>
        </div>
      </div>
    </div>

    <el-row :gutter="16" style="margin-top:16px">
      <!-- 待办任务 -->
      <el-col :span="10">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>任务与待办</span>
              <div class="card-actions">
                <el-tag v-if="overdueCount" size="small" type="danger" effect="light">逾期 {{ overdueCount }} 项</el-tag>
                <el-button link type="primary" @click="$router.push('/analytics')">查看目标</el-button>
              </div>
            </div>
          </template>
          <el-timeline v-if="tasks.length">
            <el-timeline-item
              v-for="t in tasks" :key="t.id"
              :type="t.overdue ? 'danger' : t.status === 'done' ? 'success' : 'primary'"
              :timestamp="formatDate(t.dueDate) + (t.overdue ? '（已逾期）' : '')">
              <div class="task-item">
                <span>{{ t.title }}</span>
                <span class="task-tags">
                  <el-tag size="small" :type="t.status === 'done' ? 'success' : 'info'">{{ statusMap[t.status] || t.status }}</el-tag>
                  <el-tag size="small" effect="plain">{{ categoryMap[t.category] || t.category }}</el-tag>
                </span>
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
              <div class="card-actions">
                <el-tag size="small" type="success">回复率 {{ overview.mail.replyRate }}%（行业 3-8%）</el-tag>
                <el-button link type="primary" @click="$router.push('/mail')">邮件中心</el-button>
              </div>
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
import { fmtMonthDay as formatDate } from '../utils/format';

const loading = ref(false);
const overview = ref<any>({ stats: {}, goals: { inquiry2026: { target: 100, current: 0 }, customer2028: { target: 20, current: 0 } }, mail: { week: [], replyRate: 0 }, tasks: [] });

const goals = computed(() => overview.value.goals);
// 数值兜底：后端缺字段或目标为 0 时不再出现 NaN / $NaNk
const num = (v: any) => Number(v) || 0;
const goalRate = (cur: any, target: any) => {
  const t = Number(target) || 0;
  return t > 0 ? Math.min(100, Math.round((num(cur) / t) * 100)) : 0;
};
const goalRate1 = computed(() => goalRate(goals.value.inquiry2026.current, goals.value.inquiry2026.target));
const goalRate2 = computed(() => goalRate(goals.value.customer2028.current, goals.value.customer2028.target));
const overallRate = computed(() => Math.round((goalRate1.value + goalRate2.value) / 2));
const tasks = computed(() => overview.value.tasks || []);

const statCards = computed(() => {
  const s = overview.value.stats;
  return [
    { label: '有效线索', value: num(s.leads), color: '#409eff', bg: 'linear-gradient(135deg,#ecf5ff,#d9ecff)', icon: 'Collection' },
    { label: '客户数', value: num(s.customers), color: '#67c23a', bg: 'linear-gradient(135deg,#f0f9eb,#e1f3d8)', icon: 'OfficeBuilding' },
    { label: '询盘量', value: num(s.inquiries), color: '#e6a23c', bg: 'linear-gradient(135deg,#fdf6ec,#faecd8)', icon: 'ChatDotRound' },
    { label: '进行中商机', value: num(s.opportunities), color: '#f56c6c', bg: 'linear-gradient(135deg,#fef0f0,#fde2e2)', icon: 'Suitcase' },
    { label: '商机金额', value: '$' + (num(s.pipelineAmount) / 1000).toFixed(0) + 'k', color: '#606266', bg: 'linear-gradient(135deg,#f4f4f5,#e8e8eb)', icon: 'Money' },
  ];
});

// 轨道结论：工作台要回答「增长在轨道上吗」，而不是只给一个百分比
const trackVerdict = computed(() => {
  const r = overallRate.value;
  if (r >= 70) return { label: '领先轨道', cls: 'good', note: '两个目标均进展良好，保持节奏，可适度加码' };
  if (r >= 40) return { label: '按计划推进', cls: 'ok', note: '进度符合预期，留意拖后腿的目标并适时补强' };
  return { label: '落后计划', cls: 'slow', note: '进度落后，建议优先补足短板目标、加大触达力度' };
});

const overdueCount = computed(() => tasks.value.filter((t: any) => t.overdue).length);

// 主数字滚动动画（尊重系统减弱动态偏好）
const heroDisplay = ref(0);
let heroAnim = 0;
const animateHero = () => {
  const target = overallRate.value;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { heroDisplay.value = target; return; }
  const start = performance.now();
  const dur = 800;
  const tick = (t: number) => {
    const p = Math.min(1, (t - start) / dur);
    heroDisplay.value = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) heroAnim = requestAnimationFrame(tick);
  };
  heroAnim = requestAnimationFrame(tick);
};

const categoryMap: Record<string, string> = {
  roadmap: '路线图',
  weekly: '周目标',
  checklist: '检查项',
  followup: '客户跟进',
};

const statusMap: Record<string, string> = {
  todo: '待办',
  doing: '进行中',
  done: '已完成',
};

// 日期格式化已收敛到 utils/format（fmtMonthDay），避免各页面重复实现

const chartRef = ref<HTMLElement>();
let chart: echarts.ECharts | null = null;

const renderChart = () => {
  if (!chartRef.value) return;
  chart = echarts.init(chartRef.value);
  const week = overview.value.mail.week || [];
  chart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,.92)', borderWidth: 0, textStyle: { color: '#fff' } },
    legend: { data: ['发送', '回复'], right: 8, top: 0, itemWidth: 14, itemHeight: 8, textStyle: { color: '#6b7280' } },
    grid: { left: 36, right: 16, top: 32, bottom: 24 },
    xAxis: {
      type: 'category', data: week.map((w: any) => w.day),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#9ca3af' },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value', minInterval: 1,
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#9ca3af' },
    },
    series: [
      {
        name: '发送', type: 'bar', barWidth: '46%',
        data: week.map((w: any) => w.sent),
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#4facfe' },
            { offset: 1, color: '#409eff' },
          ]),
        },
      },
      {
        name: '回复', type: 'line', smooth: true, symbolSize: 6,
        data: week.map((w: any) => w.replied),
        itemStyle: { color: '#34d399' },
        lineStyle: { color: '#34d399', width: 2 },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(52,211,153,.16)' }, { offset: 1, color: 'rgba(52,211,153,0)' }]) },
      },
    ],
  });
};

const resize = () => chart && chart.resize();

onMounted(async () => {
  loading.value = true;
  overview.value = await api.dashboard.overview();
  loading.value = false;
  animateHero();
  renderChart();
  window.addEventListener('resize', resize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize);
  cancelAnimationFrame(heroAnim);
  chart?.dispose();
});
</script>

<style scoped>
/* ---------- 增长仪表（签名主卡：深蓝渐变，与侧边栏呼应） ---------- */
.goal-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 48px;
  border-radius: 12px;
  padding: 30px 34px;
  background:
    radial-gradient(1100px 380px at 92% -30%, rgba(64, 158, 255, 0.22), transparent 60%),
    linear-gradient(160deg, #0f172a 0%, #182a4a 100%);
  color: #fff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.22);
}
.goal-hero-main { flex-shrink: 0; }
.goal-hero-head { display: flex; align-items: center; gap: 16px; }
.goal-hero-eyebrow {
  font-size: 12px;
  letter-spacing: 2.5px;
  color: rgba(255, 255, 255, 0.5);
}
.goal-hero-value {
  margin-top: 14px;
  font-size: 56px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  background: linear-gradient(90deg, #ffffff, #bfe3ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.goal-hero-unit { font-size: 20px; font-weight: 600; color: rgba(255, 255, 255, 0.55); }
.goal-hero-caption { font-size: 13px; color: rgba(255, 255, 255, 0.55); margin-top: 10px; }

/* 轨道结论胶囊 */
.goal-hero-badge {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  white-space: nowrap;
}
.goal-hero-badge.good { background: rgba(52, 211, 153, 0.16); color: #6ee7b7; box-shadow: inset 0 0 0 1px rgba(52, 211, 153, 0.35); }
.goal-hero-badge.ok { background: rgba(79, 172, 254, 0.16); color: #8fd0ff; box-shadow: inset 0 0 0 1px rgba(79, 172, 254, 0.35); }
.goal-hero-badge.slow { background: rgba(251, 146, 60, 0.16); color: #fdba74; box-shadow: inset 0 0 0 1px rgba(251, 146, 60, 0.35); }

/* 分项目标进度 */
.goal-hero-bars { flex: 1; max-width: 420px; }
.ghb-title {
  font-size: 12px;
  letter-spacing: 1.5px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 16px;
}
.goal-hero-bar + .goal-hero-bar { margin-top: 16px; }
.ghb-top { display: flex; justify-content: space-between; font-size: 12px; color: rgba(255, 255, 255, 0.7); margin-bottom: 7px; }
.ghb-num { font-variant-numeric: tabular-nums; }
.ghb-track { height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.12); overflow: hidden; }
.ghb-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #409eff, #00c6ff);
  transition: width 0.6s ease;
}
.ghb-fill-green { background: linear-gradient(90deg, #34d399, #a3e635); }

/* ---------- 统计卡（单行 5 等分） ---------- */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-top: 16px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 16px;
  border: 1px solid #eef0f3;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08); }
.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-info { min-width: 0; }
.stat-value { font-size: 22px; font-weight: 700; line-height: 1.1; font-variant-numeric: tabular-nums; }
.stat-label { font-size: 12px; color: #909399; margin-top: 4px; }

/* ---------- 通用 ---------- */
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-actions { display: flex; align-items: center; gap: 10px; }
.task-item { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; }
.task-tags { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
:deep(.el-card) { border-radius: 12px; }

@media (max-width: 1100px) {
  .goal-hero { flex-direction: column; align-items: stretch; gap: 24px; }
  .goal-hero-bars { max-width: none; }
  .stat-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 640px) {
  .goal-hero { padding: 24px 20px; }
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .ghb-fill, .stat-card { transition: none; }
  .stat-card:hover { transform: none; }
}
</style>
