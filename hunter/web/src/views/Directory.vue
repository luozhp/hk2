<template>
  <div>
    <!-- Hero -->
    <el-card shadow="never" class="head-card">
      <div class="head">
        <div class="head-left">
          <div class="title-badge"><el-icon><Shop /></el-icon></div>
          <div>
            <h2 class="title">海外行业平台</h2>
            <p class="sub">
              在 Thomasnet / Europages / Kompass / ExportHub / IndiaMART / TradeKey 等 20 个垂直行业 B2B 目录中，按产品关键词免费定向检索供应商与买家主页，命中后评分入库为线索。点「获取步骤」查看完整流程。
            </p>
          </div>
        </div>
        <div class="head-right">
          <div class="stat">
            <div class="num">{{ platformCount }}</div>
            <div class="lab">可搜索平台</div>
          </div>
          <div class="stat">
            <div class="num">{{ importedCount }}</div>
            <div class="lab">已导入线索</div>
          </div>
          <div class="head-actions">
            <el-button :icon="QuestionFilled" @click="guideVisible = true">获取步骤</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 定向搜索 -->
    <el-card shadow="never" class="panel" style="margin-top:20px">
      <template #header>
        <div class="panel-head"><span><el-icon><Search /></el-icon> 定向搜索供应商 / 买家</span></div>
      </template>
      <div class="search-row">
        <el-select v-model="platform" placeholder="选择平台" style="width:220px">
          <el-option v-for="s in orderedSources" :key="s.key" :label="`${s.name}${PLATFORM_CN[s.key] ? '（' + PLATFORM_CN[s.key] + '）' : ''} · ${s.region}`" :value="s.key" />
        </el-select>
        <el-input v-model="keyword" placeholder="产品关键词，如 cream charger" style="width:280px" @keyup.enter="doSearch" />
        <el-button type="primary" :loading="searching" @click="doSearch">搜索</el-button>
        <el-button :icon="Grid" :loading="searching" @click="getAll">获取所有平台</el-button>
        <div class="mode-row">
          <el-radio-group v-model="mode" size="small">
            <el-radio-button label="mock">模拟数据</el-radio-button>
            <el-radio-button label="live">真实搜索</el-radio-button>
          </el-radio-group>
          <el-tag v-if="providerInfo.configured && mode === 'live'" size="small" type="success">数据源 {{ providerInfo.label }} 已配置</el-tag>
          <el-tag v-else-if="mode === 'live'" size="small" type="warning">缺少凭证，将提示错误（见「获取步骤」）</el-tag>
        </div>
      </div>
      <div v-if="lastSyntax" class="syntax-note">已构造检索语法：<code>{{ lastSyntax }}</code></div>

      <!-- 搜索结果 -->
      <template v-if="results.length">
        <div class="result-toolbar">
          <div class="checks-legend">
            三标准校验：
            <el-tag size="small">① 在售同类</el-tag>
            <el-tag size="small">② 真实邮箱</el-tag>
            <el-tag size="small">③ 可定位</el-tag>
          </div>
          <div>
            <el-checkbox v-model="selectAll" @change="toggleAll">全选</el-checkbox>
            <el-button type="success" size="small" :disabled="!selected.length" @click="importSelected">校验并入库（{{ selected.length }}）</el-button>
          </div>
        </div>
        <div v-for="r in results" :key="r.id" class="result-item" :class="{ selected: selectedIds.has(r.id) }">
          <el-checkbox v-model="checkedMap[r.id]" @change="syncSelected" />
          <div class="result-body">
            <div class="result-title">
              <el-link :href="r.url" target="_blank" type="primary">{{ r.title }}</el-link>
              <el-tag size="small" type="info" effect="plain">{{ r.sourceLabel }}</el-tag>
              <el-tag size="small" :type="gradeType(r.grade)">{{ r.grade }} · {{ r.score }}分</el-tag>
            </div>
            <div class="result-desc">{{ r.desc }}</div>
            <div class="result-meta">
              <span v-if="r.city"><el-icon><Location /></el-icon> {{ r.city }}</span>
              <span>{{ r.domain }}</span>
              <span v-for="(ok, key) in r.checks" :key="key" :class="ok ? 'ok' : 'fail'">{{ checkLabel(key) }}：{{ ok ? '✓' : '✗' }}</span>
            </div>
          </div>
          <el-button size="small" type="primary" plain @click="quickAdd(r)">单条入库</el-button>
        </div>
      </template>
    </el-card>

    <!-- 平台数据源 -->
    <el-card shadow="never" class="panel" style="margin-top:20px">
      <template #header>
        <div class="panel-head">
          <span><el-icon><Grid /></el-icon> 海外垂直行业平台</span>
          <div class="sort-actions">
            <span class="sort-tip"><el-icon><Rank /></el-icon> 拖拽卡片可手动排序</span>
            <el-button v-if="orderKeys.length" size="small" text type="primary" :icon="RefreshLeft" @click="resetOrder">重置排序</el-button>
          </div>
        </div>
      </template>
      <el-row :gutter="20" style="row-gap: 20px;">
        <el-col
          v-for="(s, i) in orderedSources"
          :key="s.key"
          :xs="24" :md="12" :lg="6"
          class="src-col"
          :class="{ dragging: dragIndex === i }"
          draggable="true"
          @dragstart="onDragStart(i)"
          @dragover.prevent
          @drop="onDrop(i)"
        >
          <div class="src-card">
            <div class="drag-grip" title="拖拽排序"><el-icon><Rank /></el-icon></div>
            <div class="src-head">
              <div class="src-icon"><el-icon><OfficeBuilding /></el-icon></div>
              <div class="src-titles">
                <div class="src-name">{{ s.name }}<span class="src-cn" v-if="PLATFORM_CN[s.key]">（{{ PLATFORM_CN[s.key] }}）</span></div>
                <div class="src-provider">{{ s.provider }}</div>
              </div>
            </div>
            <div class="src-meta">{{ s.region }} · {{ s.type }}</div>
            <div class="src-cov">
              <div class="cov-label">可获取</div>
              <div class="cov-text">{{ s.coverage }}</div>
            </div>
            <el-alert :title="s.hint" type="info" :closable="false" show-icon class="src-hint" />
            <div class="src-foot">
              <el-link :href="s.url" type="primary" target="_blank" :underline="false" class="src-link">
                <el-icon><Link /></el-icon> 访问官网
              </el-link>
              <el-button size="small" type="primary" :icon="Search" @click="openSearchDialog(s)">在此搜索</el-button>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 已导入线索 -->
    <el-card shadow="never" class="panel" style="margin-top:20px">
      <template #header>
        <div class="rec-head">
          <span>
            <el-icon><Collection /></el-icon> 已导入线索
            <el-tag size="small" type="info" effect="plain" class="rec-count">{{ directoryLeads.length }}</el-tag>
          </span>
          <el-button size="small" text type="primary" :loading="loadingLeads" :icon="Refresh" @click="loadLeads">刷新</el-button>
        </div>
      </template>
      <el-table :data="directoryLeads" size="small" v-loading="loadingLeads" stripe>
        <el-table-column prop="companyName" label="公司名" min-width="180" />
        <el-table-column prop="domain" label="域名" min-width="150" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="grade" label="等级" width="80" />
        <el-table-column prop="score" label="评分" width="80" align="right" />
        <el-table-column prop="sourceNote" label="来源" min-width="150" />
        <el-table-column prop="createdAt" label="入库时间" width="170">
          <template #default="{ row }">{{ (row.createdAt || '').slice(0, 16).replace('T', ' ') }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loadingLeads && !directoryLeads.length" description="还没有从行业平台导入线索，先在上方搜索并入库" />
    </el-card>

    <!-- 获取步骤弹窗 -->
    <el-dialog v-model="guideVisible" title="如何用行业平台找海外客户" width="720px" top="6vh">
      <el-alert type="info" :closable="false" show-icon
        title="行业平台没有公开 API，本页用搜索引擎 site: 语法做「免费定向检索」，命中该平台上的供应商/买家主页后评分入库。" />
      <el-steps direction="vertical" :active="0" class="guide-steps">
        <el-step v-for="(st, i) in guideSteps" :key="i" :title="st.title" :description="st.desc" />
      </el-steps>
      <div class="guide-sites">
        <span class="gs-title">平台官网：</span>
        <el-link v-for="s in orderedSources" :key="s.key" :href="s.url" type="primary" target="_blank" :underline="false" class="gs-link">{{ s.name }}<template v-if="PLATFORM_CN[s.key]">（{{ PLATFORM_CN[s.key] }}）</template> ↗</el-link>
      </div>
    </el-dialog>

    <!-- 在此搜索弹窗 -->
    <el-dialog v-model="searchDialogVisible" :title="`在 ${dialogPlatform?.name} 定向搜索`" width="760px" top="5vh">
      <div class="dlg-search-row">
        <el-input v-model="dialogKeyword" placeholder="产品关键词，如 cream charger" style="width:340px" @keyup.enter="dialogDoSearch">
          <template #prepend>{{ dialogPlatform?.name }}</template>
        </el-input>
        <el-button type="primary" :loading="dialogSearching" @click="dialogDoSearch">搜索</el-button>
        <el-radio-group v-model="dialogMode" size="small" style="margin-left:14px">
          <el-radio-button label="mock">模拟数据</el-radio-button>
          <el-radio-button label="live">真实搜索</el-radio-button>
        </el-radio-group>
        <el-tag v-if="dialogPlatform && providerInfo.configured && dialogMode === 'live'" size="small" type="success">数据源已配置</el-tag>
        <el-tag v-else-if="dialogMode === 'live'" size="small" type="warning">缺少凭证</el-tag>
      </div>
      <div v-if="dialogSyntax" class="syntax-note">已构造检索语法：<code>{{ dialogSyntax }}</code></div>
      <div v-if="dialogResults.length" class="dlg-stat">共命中 <b>{{ dialogResults.length }}</b> 条结果<template v-if="dialogHasMore">（已加载 {{ dialogVisibleResults.length }}）</template></div>

      <div v-if="dialogResults.length" class="dlg-results" @scroll="onDialogScroll">
        <div class="result-toolbar">
          <div class="checks-legend">
            三标准校验：
            <el-tag size="small">① 在售同类</el-tag>
            <el-tag size="small">② 真实邮箱</el-tag>
            <el-tag size="small">③ 可定位</el-tag>
          </div>
          <div>
            <el-checkbox v-model="dialogSelectAll" @change="dialogToggleAll">全选</el-checkbox>
            <el-button type="success" size="small" :disabled="!dialogSelected.length" @click="dialogImportSelected">校验并入库（{{ dialogSelected.length }}）</el-button>
          </div>
        </div>
        <div v-for="r in dialogVisibleResults" :key="r.id" class="result-item" :class="{ selected: dialogSelectedIds.has(r.id) }">
          <el-checkbox v-model="dialogCheckedMap[r.id]" @change="dialogSyncSelected" />
          <div class="result-body">
            <div class="result-title">
              <el-link :href="r.url" target="_blank" type="primary">{{ r.title }}</el-link>
              <el-tag size="small" type="info" effect="plain">{{ r.sourceLabel }}</el-tag>
              <el-tag size="small" :type="gradeType(r.grade)">{{ r.grade }} · {{ r.score }}分</el-tag>
            </div>
            <div class="result-desc">{{ r.desc }}</div>
            <div class="result-meta">
              <span v-if="r.city"><el-icon><Location /></el-icon> {{ r.city }}</span>
              <span>{{ r.domain }}</span>
              <span v-for="(ok, key) in r.checks" :key="key" :class="ok ? 'ok' : 'fail'">{{ checkLabel(key) }}：{{ ok ? '✓' : '✗' }}</span>
            </div>
          </div>
          <el-button size="small" type="primary" plain @click="dialogQuickAdd(r)">单条入库</el-button>
        </div>
        <div v-if="dialogHasMore" class="dlg-loadmore">
          <el-button text type="primary" :loading="dialogLoadingMore" @click="loadMore">加载更多（还剩 {{ dialogResults.length - dialogShown }} 条）</el-button>
        </div>
      </div>
      <el-empty v-else-if="!dialogSearching" description="输入关键词，在该平台上定向检索供应商/买家主页" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Shop, QuestionFilled, Location, Link, Refresh, Grid, OfficeBuilding, Collection, Rank, RefreshLeft } from '@element-plus/icons-vue';
import api from '../api';

const PLATFORM_CN: Record<string, string> = {
  THOMASNET: '托马斯网',
  INDUSTRYSTOCK: '工业库存网',
  EUROPAGES: '欧洲企业名录',
  KOMPASS: '康帕斯全球名录',
  DIRECTINDUSTRY: '工业直供网',
  GLOBALSPEC: '环球工业网',
  MADEINCHINA: '中国制造网',
  GLOBALSOURCES: '环球资源',
  EXPORTHUB: '出口中心',
  TRADEKEY: '贸易钥匙',
  EC21: 'EC21 贸易网',
  GO4WORLDBUSINESS: '全球商贸网',
  INDIAMART: '印度集市',
  WERLIEFERTWAS: '德国供应商名录',
  KELLYSEARCH: '凯利工业搜索',
  PROCESSREGISTER: '流程工业名录',
  B2BRAZIL: '巴西 B2B 网',
  PULSCEN: '俄罗斯采购网',
  CYLEX: '赛莱克斯名录',
  YELLOWPAGES: '黄页',
};
const sources = ref<any[]>([]);
const platform = ref('');
const keyword = ref('cream charger');
const mode = ref<'live' | 'mock'>('mock');
const providerInfo = ref<{ provider: string; label: string; configured: boolean }>({
  provider: 'mock', label: '模拟数据', configured: true,
});

const searching = ref(false);
const results = ref<any[]>([]);
const lastSyntax = ref('');
const checkedMap = reactive<Record<string, boolean>>({});
const selectedIds = ref<Set<string>>(new Set());
const selectAll = ref(false);

const directoryLeads = ref<any[]>([]);
const loadingLeads = ref(false);
const guideVisible = ref(false);

const platformCount = computed(() => sources.value.length);
const importedCount = computed(() => directoryLeads.value.length);
const selected = computed(() => results.value.filter((r) => selectedIds.value.has(r.id)));

// 手动排序：顺序持久化到服务器（按登录用户隔离，跨设备共享）
const orderKeys = ref<string[]>([]);
const dragIndex = ref<number | null>(null);
async function loadOrder() {
  try { const ord = await api.directory.order(); if (Array.isArray(ord)) orderKeys.value = ord; } catch { /* 未登录或失败则用默认顺序 */ }
}
function saveOrder() {
  api.directory.saveOrder({ order: orderKeys.value }).catch(() => { /* 静默失败，保留本地顺序 */ });
}
const orderedSources = computed(() => {
  const list = [...sources.value];
  if (!orderKeys.value.length) return list;
  const map = new Map(list.map((s) => [s.key, s]));
  const ordered = orderKeys.value.map((k) => map.get(k)).filter(Boolean) as any[];
  const rest = list.filter((s) => !orderKeys.value.includes(s.key));
  return [...ordered, ...rest];
});
function onDragStart(i: number) { dragIndex.value = i; }
function onDrop(i: number) {
  const from = dragIndex.value;
  dragIndex.value = null;
  if (from === null || from === i) return;
  const keys = orderedSources.value.map((s) => s.key);
  const moved = keys.splice(from, 1)[0];
  keys.splice(i, 0, moved);
  orderKeys.value = keys;
  saveOrder();
}
function resetOrder() { orderKeys.value = []; saveOrder(); }

const guideSteps = [
  { title: '1. 选择平台', desc: 'Thomasnet（美国制造业）、IndustryStock / Europages / WLW（欧洲）、Kompass（全球）、ExportHub / TradeKey / EC21（综合 B2B）、IndiaMART（印度）、B2Brazil（巴西）、Pulscen（俄罗斯）、Made-in-China / GlobalSources（亚洲供应商）等 20 个平台，按目标市场选择。' },
  { title: '2. 确定关键词', desc: '输入你要开发的产品词（如 cream charger），越精准越容易命中真实供应商/买家主页。' },
  { title: '3. 在线定向搜索', desc: '系统自动构造 `"关键词" site:平台域名` 语法，通过搜索引擎免费检索该平台上的企业主页（需先在「线索采集」页配置 Google CSE 或 SerpAPI 凭证，否则用模拟数据演示）。' },
  { title: '4. 评分筛选', desc: '三标准校验：① 在售同类 ② 有真实邮箱 ③ 可定位，自动打分分级（A/B/C）。' },
  { title: '5. 入库开发', desc: '勾选批量或单条入库为线索（来源=行业平台），进入线索池分配跟进、邮件触达。' },
];

const checkLabel = (k: string | number) => ({ check1: '①在售同类', check2: '②真实邮箱', check3: '③可定位' } as any)[String(k)];
const gradeType = (g: string) => ({ A: 'success', B: 'warning', C: 'info' } as any)[g];

const loadSources = async () => {
  sources.value = await api.directory.sources();
  if (!platform.value && orderedSources.value.length) platform.value = orderedSources.value[0].key;
};
const loadLeads = async () => {
  loadingLeads.value = true;
  try {
    directoryLeads.value = await api.leads.list({ source: 'directory' });
  } finally {
    loadingLeads.value = false;
  }
};
const loadProvider = async () => {
  try {
    const p = await api.discover.provider();
    providerInfo.value = {
      provider: p.provider || 'mock',
      label: p.label || (p.provider === 'google' ? 'Google CSE' : p.provider === 'serp' ? 'SerpAPI' : '模拟数据'),
      configured: !!p.configured,
    };
    mode.value = p.provider === 'mock' ? 'mock' : 'live';
  } catch { /* 默认 mock */ }
};
onMounted(() => {
  loadOrder();
  loadSources();
  loadLeads();
  loadProvider();
});

// —— 在此搜索弹窗：在指定平台内定向检索并可入库 ——
const searchDialogVisible = ref(false);
const dialogPlatform = ref<any>(null);
const dialogKeyword = ref('');
const dialogMode = ref<'live' | 'mock'>('mock');
const dialogSearching = ref(false);
const dialogSyntax = ref('');
const dialogResults = ref<any[]>([]);
const dialogCheckedMap = reactive<Record<string, boolean>>({});
const dialogSelectedIds = ref<Set<string>>(new Set());
const dialogSelectAll = ref(false);
const dialogSelected = computed(() => dialogResults.value.filter((r) => dialogSelectedIds.value.has(r.id)));

const dialogPageSize = 8;
const dialogShown = ref(0);
const dialogLoadingMore = ref(false);
const dialogVisibleResults = computed(() => dialogResults.value.slice(0, dialogShown.value));
const dialogHasMore = computed(() => dialogShown.value < dialogResults.value.length);

const openSearchDialog = (s: any) => {
  dialogPlatform.value = s;
  dialogKeyword.value = keyword.value || '';
  dialogMode.value = mode.value;
  dialogResults.value = [];
  dialogSyntax.value = '';
  Object.keys(dialogCheckedMap).forEach((k) => delete dialogCheckedMap[k]);
  dialogSelectedIds.value = new Set();
  dialogSelectAll.value = false;
  dialogShown.value = 0;
  searchDialogVisible.value = true;
};
const dialogDoSearch = async () => {
  if (!dialogKeyword.value.trim()) return ElMessage.warning('请输入关键词');
  dialogSearching.value = true;
  try {
    const resp: any = await api.directory.search({ platform: dialogPlatform.value.key, keyword: dialogKeyword.value, mode: dialogMode.value });
    dialogResults.value = resp.results || [];
    dialogSyntax.value = resp.syntax || '';
    Object.keys(dialogCheckedMap).forEach((k) => delete dialogCheckedMap[k]);
    dialogSelectedIds.value = new Set();
    dialogSelectAll.value = false;
    dialogShown.value = dialogPageSize;
    if (!dialogResults.value.length) ElMessage.info('无搜索结果，可换关键词或平台');
  } finally {
    dialogSearching.value = false;
  }
};
const dialogToggleAll = (val: boolean) => {
  dialogResults.value.forEach((r) => {
    dialogCheckedMap[r.id] = val;
    if (val) dialogSelectedIds.value.add(r.id);
    else dialogSelectedIds.value.delete(r.id);
  });
};
const dialogSyncSelected = () => {
  dialogSelectedIds.value = new Set(dialogResults.value.filter((r) => dialogCheckedMap[r.id]).map((r) => r.id));
  dialogSelectAll.value = dialogSelectedIds.value.size === dialogResults.value.length;
};
const dialogQuickAdd = async (r: any) => {
  await api.leads.create(toLeadPayload(r));
  ElMessage.success('已入库');
  loadLeads();
};
const dialogImportSelected = async () => {
  await ElMessageBox.confirm(`确认将 ${dialogSelected.value.length} 条线索校验并入库？`, '批量入库', { type: 'info' });
  const res = await api.leads.import({ items: dialogSelected.value.map(toLeadPayload) });
  ElMessage.success(`成功入库 ${res.imported} 条线索`);
  dialogResults.value = [];
  loadLeads();
};
const loadMore = () => {
  if (dialogLoadingMore.value || !dialogHasMore.value) return;
  dialogLoadingMore.value = true;
  setTimeout(() => {
    dialogShown.value = Math.min(dialogShown.value + dialogPageSize, dialogResults.value.length);
    dialogLoadingMore.value = false;
  }, 250);
};
const onDialogScroll = (e: any) => {
  const el = e.target;
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 60) loadMore();
};

const doSearch = async () => {
  if (!platform.value) return ElMessage.warning('请选择平台');
  if (!keyword.value.trim()) return ElMessage.warning('请输入关键词');
  searching.value = true;
  try {
    const resp: any = await api.directory.search({ platform: platform.value, keyword: keyword.value, mode: mode.value });
    results.value = resp.results || [];
    lastSyntax.value = resp.syntax || '';
    Object.keys(checkedMap).forEach((k) => delete checkedMap[k]);
    selectedIds.value = new Set();
    selectAll.value = false;
    if (!results.value.length) ElMessage.info('无搜索结果，可换关键词或平台');
  } finally {
    searching.value = false;
  }
};

const getAll = async () => {
  if (!keyword.value.trim()) return ElMessage.warning('请输入关键词');
  await ElMessageBox.confirm(`将依次在 ${sources.value.length} 个平台搜索「${keyword.value}」，确认？`, '获取所有平台', { type: 'info' });
  searching.value = true;
  try {
    const resp: any = await api.directory.searchAll({ keyword: keyword.value, mode: mode.value });
    results.value = resp.results || [];
    lastSyntax.value = `已搜索 ${resp.groups.length} 个平台，命中 ${resp.count} 条`;
    Object.keys(checkedMap).forEach((k) => delete checkedMap[k]);
    selectedIds.value = new Set();
    selectAll.value = false;
    if (resp.errors?.length) ElMessage.warning(`部分平台搜索失败：${resp.errors.join('；')}`);
    if (!results.value.length) ElMessage.info('无搜索结果，可换关键词');
  } finally {
    searching.value = false;
  }
};

const toggleAll = (val: boolean) => {
  results.value.forEach((r) => {
    checkedMap[r.id] = val;
    if (val) selectedIds.value.add(r.id);
    else selectedIds.value.delete(r.id);
  });
};

const syncSelected = () => {
  selectedIds.value = new Set(results.value.filter((r) => checkedMap[r.id]).map((r) => r.id));
  selectAll.value = selectedIds.value.size === results.value.length;
};

const toLeadPayload = (r: any) => ({
  companyName: String(r.title || '').split(/[|\-–]/)[0].trim(),
  domain: r.domain,
  email: r.email,
  source: 'directory',
  sourceNote: `行业平台 · ${r.sourceLabel}`,
  check1: r.checks.check1, check2: r.checks.check2, check3: r.checks.check3,
  score: r.score, custType: 'importer',
});

const quickAdd = async (r: any) => {
  await api.leads.create(toLeadPayload(r));
  ElMessage.success('已入库');
  loadLeads();
};

const importSelected = async () => {
  await ElMessageBox.confirm(`确认将 ${selected.value.length} 条线索校验并入库？`, '批量入库', { type: 'info' });
  const res = await api.leads.import({ items: selected.value.map(toLeadPayload) });
  ElMessage.success(`成功入库 ${res.imported} 条线索`);
  results.value = [];
  lastSyntax.value = '';
  loadLeads();
};
</script>

<style scoped>
* { box-sizing: border-box; }

.head-card { border: 1px solid #eef2f7; border-radius: 14px; background: #fff; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); }
.head { display: flex; justify-content: space-between; align-items: center; gap: 24px; }
.head-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
.title-badge { width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 22px; }
.title { font-size: 20px; font-weight: 800; color: #1f2937; margin: 0 0 6px; }
.sub { font-size: 13px; color: #64748b; line-height: 1.7; margin: 0; }
.head-right { display: flex; align-items: center; flex-shrink: 0; }
.stat { text-align: center; padding: 0 26px; border-left: 1px solid #eef2f7; }
.stat:first-child { border-left: none; padding-left: 0; }
.stat .num { font-size: 26px; font-weight: 800; color: #1f2937; line-height: 1.1; }
.stat .lab { font-size: 12px; color: #909399; margin-top: 3px; }
.head-actions { display: flex; gap: 10px; margin-left: 26px; padding-left: 26px; border-left: 1px solid #eef2f7; }

.panel { border-radius: 14px; border-color: #eef2f7; }
.panel-head, .rec-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.panel-head :deep(.el-icon), .rec-head :deep(.el-icon) { color: #2563eb; margin-right: 6px; vertical-align: -2px; }

.search-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.mode-row { display: flex; align-items: center; gap: 10px; margin-left: auto; flex-wrap: wrap; }
.syntax-note { margin-top: 12px; font-size: 12px; color: #909399; }
.syntax-note code { color: #2563eb; background: #f0f6ff; padding: 2px 6px; border-radius: 4px; }
.dlg-search-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.dlg-stat { font-size: 13px; color: #475569; margin: 4px 0 10px; }
.dlg-stat b { color: #2563eb; }
.dlg-results { max-height: 56vh; overflow-y: auto; padding-right: 6px; }
.dlg-loadmore { text-align: center; padding: 10px 0 2px; }

.result-toolbar { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 10px; }
.checks-legend { display: flex; gap: 8px; align-items: center; font-size: 12px; color: #909399; flex-wrap: wrap; }
.result-item { display: flex; gap: 12px; padding: 14px 10px; border-bottom: 1px solid #f0f2f5; align-items: flex-start; }
.result-item.selected { background: #f0f7ff; }
.result-body { flex: 1; min-width: 0; }
.result-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.result-desc { font-size: 13px; color: #606266; margin: 6px 0; }
.result-meta { display: flex; gap: 14px; font-size: 12px; color: #909399; flex-wrap: wrap; align-items: center; }
.result-meta .ok { color: #67c23a; }
.result-meta .fail { color: #f56c6c; }

.src-col { /* 间距由 row-gap 控制 */ }
.src-card { position: relative; border: 1px solid #eef2f7; border-radius: 14px; padding: 20px 20px 22px; background: #fff; height: 100%; display: flex; flex-direction: column; transition: box-shadow 0.25s ease, transform 0.25s ease; }
.src-card:hover { box-shadow: 0 12px 28px rgba(15, 23, 42, 0.1); transform: translateY(-2px); }
.sort-actions { display: flex; align-items: center; gap: 12px; }
.sort-tip { font-size: 12px; color: #94a3b8; display: inline-flex; align-items: center; gap: 4px; }
.drag-grip { position: absolute; top: 10px; right: 10px; color: #cbd5e1; cursor: grab; font-size: 16px; line-height: 1; transition: color 0.2s; }
.drag-grip:hover { color: #2563eb; }
.drag-grip:active { cursor: grabbing; }
.src-col.dragging .src-card { opacity: 0.55; box-shadow: 0 0 0 2px #93c5fd; }
.src-head { display: flex; align-items: center; gap: 12px; }
.src-icon { width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; color: #fff; background: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 19px; }
.src-titles { flex: 1; min-width: 0; }
.src-name { font-size: 14.5px; font-weight: 700; color: #1f2937; }
.src-cn { font-size: 12px; font-weight: 500; color: #94a3b8; margin-left: 2px; }
.src-provider { font-size: 11.5px; color: #94a3b8; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.src-meta { font-size: 12px; color: #64748b; margin: 16px 0 10px; font-weight: 600; }
.src-cov { background: #f8fafc; border-radius: 9px; padding: 12px 14px; margin-bottom: 16px; }
.cov-label { font-size: 11px; color: #94a3b8; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 8px; text-transform: uppercase; }
.cov-text { font-size: 12.5px; color: #475569; line-height: 1.65; }
.src-hint { border-radius: 9px; }
.src-hint :deep(.el-alert__title) { font-weight: 500; font-size: 12.5px; line-height: 1.6; }
.src-foot { margin-top: auto; border-top: 1px dashed #eef2f7; padding-top: 16px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.src-link { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; }

.rec-count { margin-left: 8px; }
.guide-steps { margin: 18px 0; }
.guide-steps :deep(.el-step__description) { line-height: 1.7; font-size: 13px; color: #475569; padding-right: 8px; }
.guide-sites { border-top: 1px dashed #eef2f7; padding-top: 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.gs-title { font-size: 13px; color: #64748b; }
.gs-link { font-size: 13px; font-weight: 600; }

@media (max-width: 960px) {
  .head { flex-wrap: wrap; }
  .head-left { flex: 1 1 100%; }
  .head-right { flex-wrap: wrap; }
}
</style>
