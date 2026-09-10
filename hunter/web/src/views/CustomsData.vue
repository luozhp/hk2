<template>
  <div>
    <!-- 顶部 Hero 说明 + 统计 -->
    <el-card shadow="never" class="head-card">
      <div class="head">
        <div class="head-left">
          <div class="title-badge"><el-icon><Histogram /></el-icon></div>
          <div>
            <h2 class="title">海关数据</h2>
            <p class="sub">
              数据源分三类：① 商业提单（ImportGenius/Volza 等）导出 CSV 后「导入」成线索；② 免费官方 API（美国 Census）按 HS 编码在线查进出口统计；③ 不可获取的数据源已标注原因与替代方案。点「获取步骤」查看完整流程。
            </p>
          </div>
        </div>
        <div class="head-right">
          <div class="stat">
            <div class="num">{{ records.length }}</div>
            <div class="lab">已导入记录</div>
          </div>
          <div class="stat">
            <div class="num">{{ importableCount }}</div>
            <div class="lab">可导入源</div>
          </div>
          <div class="stat">
            <div class="num">{{ apiFreeCount }}</div>
            <div class="lab">免费 API 源</div>
          </div>
          <div class="head-actions">
            <el-button :icon="QuestionFilled" @click="guideVisible = true">获取步骤</el-button>
            <el-button type="primary" :icon="Download" @click="downloadTemplate">下载模板</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 数据源总览 -->
    <el-card shadow="never" class="panel" style="margin-top:20px">
      <template #header>
        <div class="panel-head">
          <span><el-icon><DataBoard /></el-icon> 数据源与获取方式</span>
        </div>
      </template>
      <el-alert
        title="绿色=可导入（导出 CSV 后上传）；蓝色=免费 API 在线查询（按 HS 编码查进出口统计）；红色=不可获取（已说明原因与替代方案）。"
        type="info" :closable="false" show-icon class="legend" />
      <el-row :gutter="20" style="row-gap: 20px;">
        <el-col v-for="s in sources" :key="s.key" :xs="24" :md="12" :lg="8" class="src-col">
          <div class="src-card" :class="`mode-${s.mode}`">
            <div class="src-head">
              <div class="src-icon"><el-icon><component :is="modeIcon(s.mode)" /></el-icon></div>
              <div class="src-titles">
                <div class="src-name">{{ s.name }}</div>
                <div class="src-provider">{{ s.provider }}</div>
              </div>
              <el-tag size="small" :type="modeTag(s.mode)" effect="dark" class="src-tag">{{ modeLabel(s.mode) }}</el-tag>
            </div>

            <div class="src-meta">{{ s.countries }}</div>
            <div class="src-cov">
              <div class="cov-label">可获取</div>
              <div v-if="covChips(s).length" class="cov-chips">
                <el-tag v-for="(c, i) in covChips(s)" :key="i" size="small" effect="plain" class="cov-chip">{{ c }}</el-tag>
              </div>
              <div v-else class="cov-text">{{ s.coverage }}</div>
            </div>

            <el-alert
              v-if="s.mode === 'blocked'"
              :title="'不可获取：' + s.hint"
              type="error" :closable="false" show-icon class="src-hint" />
            <el-alert
              v-else-if="s.mode === 'api_limited'"
              :title="'受限说明：' + s.hint"
              type="warning" :closable="false" show-icon class="src-hint" />
            <el-alert
              v-else
              :title="s.hint"
              type="info" :closable="false" show-icon class="src-hint" />

            <el-link v-if="s.url" :href="s.url" type="primary" target="_blank" :underline="false" class="src-link">
              <el-icon><Link /></el-icon> 访问官网 / 申请入口
            </el-link>

            <div class="src-foot" v-if="s.mode === 'import'">
              <el-button size="small" type="primary" :icon="UploadFilled" @click="openImport(s)">导入 CSV</el-button>
            </div>

            <div v-else-if="s.mode === 'api_free'" class="src-query">
              <div class="q-form">
                <el-input v-model="queryState[s.key].hsCode" size="small" placeholder="HS 编码" style="width:120px" />
                <el-input v-model="queryState[s.key].year" size="small" placeholder="年份" style="width:84px" />
                <el-select v-model="queryState[s.key].flow" size="small" style="width:92px">
                  <el-option label="进口" value="import" />
                  <el-option label="出口" value="export" />
                </el-select>
                <el-button size="small" type="primary" :loading="queryState[s.key].loading" @click="doQuery(s.key)">查询</el-button>
              </div>
              <div v-if="queryState[s.key].result" class="q-res">
                <div class="q-note">{{ queryState[s.key].result.note }}</div>
                <el-table
                  v-if="queryState[s.key].result.rows.length"
                  :data="queryState[s.key].result.rowsObj" size="small" max-height="240" border>
                  <el-table-column v-for="(c, i) in queryState[s.key].result.columns" :key="i" :prop="'c' + i" :label="c" />
                </el-table>
                <div v-else class="q-empty">{{ queryState[s.key].result.note }}</div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 已导入记录 -->
    <el-card shadow="never" class="panel" style="margin-top:20px">
      <template #header>
        <div class="rec-head">
          <span>
            <el-icon><List /></el-icon> 已导入海关记录
            <el-tag size="small" type="info" effect="plain" class="rec-count">{{ filteredRecords.length }}</el-tag>
          </span>
          <div class="rec-filter">
            <el-input v-model="searchKeyword" size="small" placeholder="搜索进口商 / 供应商" :prefix-icon="Search" clearable style="width:200px" />
            <el-select v-model="sourceFilter" size="small" placeholder="全部数据源" clearable style="width:170px">
              <el-option v-for="o in sourceOptions" :key="o" :label="o" :value="o" />
            </el-select>
            <el-button size="small" text type="primary" :loading="loading" :icon="Refresh" @click="loadRecords">刷新</el-button>
          </div>
        </div>
      </template>
      <el-table :data="filteredRecords" size="small" v-loading="loading" stripe>
        <el-table-column prop="importer" label="进口商" min-width="160" />
        <el-table-column prop="importerDomain" label="域名" min-width="150">
          <template #default="{ row }">
            <span v-if="row.importerDomain" class="domain">{{ row.importerDomain }}</span>
            <span v-else class="domain-empty">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="sourceLabel" label="数据源" width="150" />
        <el-table-column prop="supplier" label="供应商" min-width="140" />
        <el-table-column prop="hsCode" label="HS 编码" width="110" />
        <el-table-column label="货量(TEU)" width="100" align="right">
          <template #default="{ row }">{{ row.teu ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="originCountry" label="原产国" width="90" />
        <el-table-column prop="arrivalDate" label="到港日期" width="120" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewLead(row)">看线索</el-button>
            <el-button link type="danger" size="small" @click="removeRec(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && !filteredRecords.length" :description="records.length ? '没有匹配的记录' : '还没有导入海关记录，从上方数据源导入 CSV'" />
    </el-card>

    <!-- 导入向导 -->
    <el-dialog v-model="importVisible" :title="`导入海关数据 · ${activeSource?.name || ''}`" width="760px" top="4vh">
      <el-steps :active="importStep" align-center finish-status="success" class="imp-steps">
        <el-step title="上传 CSV" />
        <el-step title="字段映射" />
        <el-step title="确认导入" />
      </el-steps>

      <div v-if="importStep === 0" class="imp-body">
        <el-upload
          drag
          :auto-upload="false"
          :show-file-list="false"
          accept=".csv"
          :on-change="onFile">
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="up-text">拖入或点击上传 CSV（从 ImportGenius / Volza / Panjiva 等导出）</div>
          <div class="el-upload__tip">建议先下载模板整理列；表头需含公司名 / 进口商、邮箱、供应商、HS 编码等</div>
        </el-upload>
        <div v-if="parseResult" class="parse-info">
          已解析：{{ parseResult.headers.length }} 列，{{ parseResult.rows.length }} 行
        </div>
      </div>

      <div v-else-if="importStep === 1" class="imp-body">
        <p class="map-tip">将 CSV 列映射到系统字段（公司名 / 进口商为必填，其余可选）：</p>
        <el-form label-width="150px" class="map-form">
          <el-form-item v-for="f in mapFields" :key="f.key" :label="f.label">
            <el-select v-model="fieldMap[f.key]" placeholder="不导入该字段" clearable style="width:100%">
              <el-option v-for="(h, i) in parseResult.headers" :key="i" :label="h || '(空列名)'" :value="i" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <div v-else class="imp-body">
        <el-alert
          type="info" :closable="false" show-icon
          :title="`将导入 ${pendingRecords.length} 条海关记录，并同步生成「海关数据」来源线索`" />
        <el-table :data="pendingRecords.slice(0, 8)" size="small" style="margin-top:12px">
          <el-table-column prop="importer" label="进口商" min-width="160" />
          <el-table-column prop="email" label="邮箱" min-width="160" />
          <el-table-column prop="supplier" label="供应商" min-width="140" />
        </el-table>
        <div v-if="pendingRecords.length > 8" class="more">… 其余 {{ pendingRecords.length - 8 }} 条省略显示</div>
      </div>

      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button v-if="importStep > 0" @click="importStep--">上一步</el-button>
        <el-button v-if="importStep === 0" type="primary" :disabled="!parseResult" @click="toMap">下一步</el-button>
        <el-button
          v-else-if="importStep === 1" type="primary"
          :disabled="fieldMap.company === '' || fieldMap.company === undefined"
          @click="toConfirm">下一步</el-button>
        <el-button v-else type="primary" :loading="importing" @click="doImport">确认导入</el-button>
      </template>
    </el-dialog>

    <!-- 获取步骤弹窗 -->
    <el-dialog v-model="guideVisible" title="如何获取海关数据" width="720px" top="6vh">
      <el-alert type="info" :closable="false" show-icon
        title="两条路径：① 免费官方 API 直接在线查（统计级、无公司名，用于选品/选市场）；② 商业提单导出 CSV 导入（有公司名，用于直接开发买家）。" />
      <el-steps direction="vertical" :active="0" class="guide-steps">
        <el-step v-for="(st, i) in guideSteps" :key="i" :title="st.title" :description="st.desc" />
      </el-steps>
      <div class="guide-sites">
        <span class="gs-title">数据源官网 / 申请入口：</span>
        <el-link
          v-for="s in sources.filter((x) => x.url)" :key="s.key"
          :href="s.url" type="primary" target="_blank" :underline="false" class="gs-link">
          {{ s.name }} ↗
        </el-link>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Download, UploadFilled, Histogram, QuestionFilled, Search, Refresh,
  Link, DataBoard, List, Document, DataLine, WarningFilled,
} from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import api from '../api';

const router = useRouter();
const sources = ref<any[]>([]);
const records = ref<any[]>([]);
const loading = ref(false);

const importableCount = computed(
  () => sources.value.filter((s) => s.mode === 'import').length,
);
const apiFreeCount = computed(
  () => sources.value.filter((s) => s.mode === 'api_free').length,
);

// 记录筛选
const searchKeyword = ref('');
const sourceFilter = ref('');
const sourceOptions = computed(() => [...new Set(records.value.map((r) => r.sourceLabel).filter(Boolean))]);
const filteredRecords = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase();
  const sf = sourceFilter.value;
  return records.value.filter((r) => {
    if (sf && r.sourceLabel !== sf) return false;
    if (kw && !String(r.importer || '').toLowerCase().includes(kw) && !String(r.supplier || '').toLowerCase().includes(kw)) {
      return false;
    }
    return true;
  });
});

// 免费 API 源的查询状态（按 sourceKey 索引）
const queryState = reactive<
  Record<string, { hsCode: string; year: string; flow: string; loading: boolean; result: any }>
>({});

const loadSources = async () => {
  sources.value = await api.customs.sources();
  const y = String(new Date().getFullYear() - 1);
  sources.value
    .filter((s) => s.mode === 'api_free')
    .forEach((s) => {
      if (!queryState[s.key]) {
        queryState[s.key] = { hsCode: '280420', year: y, flow: 'import', loading: false, result: null };
      }
    });
};
const loadRecords = async () => {
  loading.value = true;
  try {
    records.value = await api.customs.records();
  } finally {
    loading.value = false;
  }
};
onMounted(() => {
  loadSources();
  loadRecords();
});

const modeLabel = (m: string) =>
  ({ import: '可导入', api_free: '免费 API', blocked: '不可获取', api_limited: '受限/未接入' } as any)[m] || m;
const modeTag = (m: string) =>
  ({ import: 'success', api_free: 'primary', blocked: 'danger', api_limited: 'warning' } as any)[m] || 'info';
const modeIcon = (m: string) =>
  ({ import: Document, api_free: DataLine, blocked: WarningFilled, api_limited: WarningFilled } as any)[m] || Document;

// 将「可获取」字段拆成标签；不可获取源（以 — 开头）保持原文
const covChips = (s: any) => {
  if (!s.coverage || String(s.coverage).startsWith('—')) return [];
  return String(s.coverage).split(/[、,，]/).map((x: string) => x.trim()).filter(Boolean);
};

/* ---------- 获取步骤弹窗 ---------- */
const guideVisible = ref(false);
const guideSteps = [
  {
    title: '1. 选择数据源',
    desc: '免费官方 API（美国 Census）：免费、填 Key 即可在线查，无公司名，适合选品/选市场；商业提单（ImportGenius/Volza/Zauba）：有公司名，需去官网注册购买后导出 CSV；红色=不可获取（如中国出口海关），按提示走替代方案。',
  },
  {
    title: '2. 获取原始数据',
    desc: 'API 源：在卡片内输入 HS 编码 + 年份 + 进口/出口，点「查询」实时拉取美国该品类进口统计（来源国、金额、净重）。商业提单：在官网按国家/HS/时间段筛选买家后导出 CSV。',
  },
  {
    title: '3. 上传并映射字段',
    desc: '点卡片「导入 CSV」→ 上传文件 → 系统自动识别表头，手动校正「公司名/进口商」等字段映射（公司名为必填）。',
  },
  {
    title: '4. 生成线索',
    desc: '确认导入后，每条记录自动生成一条「海关数据」来源线索（评分 A 级、来源=customs），进入线索池。',
  },
  {
    title: '5. 开发跟进',
    desc: '线索在「邮件中心」批量触达买家，在「看板」跟踪转化，在「线索池」分配跟进。',
  },
];

/* ---------- 免费 API 在线查询 ---------- */
const doQuery = async (key: string) => {
  const st = queryState[key];
  if (!st) return;
  st.loading = true;
  st.result = null;
  try {
    const res: any = await api.customs.query({
      source: key,
      hsCode: st.hsCode,
      year: st.year,
      flow: st.flow,
    });
    const rowsObj = (res.rows || []).map((r: any[]) => {
      const o: any = {};
      r.forEach((v, i) => (o['c' + i] = v));
      return o;
    });
    st.result = { ...res, rowsObj };
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || '查询失败';
    ElMessage.error(msg);
  } finally {
    st.loading = false;
  }
};

/* ---------- 导入向导 ---------- */
const importVisible = ref(false);
const importStep = ref(0);
const activeSource = ref<any>(null);
const parseResult = ref<{ headers: string[]; rows: string[][] } | null>(null);
const fieldMap = reactive<Record<string, number | ''>>({
  company: '', email: '', supplier: '', hsCode: '', teu: '', arrivalDate: '', originCountry: '',
});
const mapFields = [
  { key: 'company', label: '公司名 / 进口商（必填）' },
  { key: 'email', label: '邮箱' },
  { key: 'supplier', label: '供应商' },
  { key: 'hsCode', label: 'HS 编码' },
  { key: 'teu', label: '货量 (TEU / 柜)' },
  { key: 'arrivalDate', label: '到港日期' },
  { key: 'originCountry', label: '原产国' },
];
const importing = ref(false);
const pendingRecords = ref<any[]>([]);

const openImport = (s: any) => {
  activeSource.value = s;
  importStep.value = 0;
  parseResult.value = null;
  Object.keys(fieldMap).forEach((k) => ((fieldMap as any)[k] = ''));
  importVisible.value = true;
};

const autoMap = (headers: string[]) => {
  const rules: Record<string, string[]> = {
    company: ['importer', 'company', 'consignee', 'buyer', 'shipper', 'import', '进口商', '公司', 'name'],
    email: ['email', 'mail', '邮箱', 'e-mail'],
    supplier: ['supplier', 'vendor', 'seller', '供应商'],
    hsCode: ['hs', 'hs_code', 'hscode', '编码', 'hs code'],
    teu: ['teu', 'quantity', 'qty', 'weight', '柜', '货量', 'containers'],
    arrivalDate: ['arrival', 'date', 'etd', 'eta', '到港', '日期'],
    originCountry: ['origin', 'country', '原产', '国家'],
  };
  const lower = headers.map((h) => String(h || '').toLowerCase());
  for (const key of Object.keys(rules)) {
    const idx = lower.findIndex((h) => rules[key].some((r) => h.includes(r)));
    (fieldMap as any)[key] = idx >= 0 ? idx : '';
  }
};

const parseCSV = (text: string) => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return { headers: [], rows: [] };
  const splitLine = (line: string) => {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = false;
        } else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ',') { out.push(cur); cur = ''; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out;
  };
  const headers = splitLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map((l) => splitLine(l));
  return { headers, rows };
};

const onFile = (file: any) => {
  const raw = file?.raw || file;
  if (!raw) return;
  const reader = new FileReader();
  reader.onload = () => {
    const res = parseCSV(String(reader.result || ''));
    if (!res.headers.length) {
      ElMessage.error('未解析到表头，请检查 CSV 格式');
      return;
    }
    parseResult.value = res;
    autoMap(res.headers);
    ElMessage.success('文件已解析');
  };
  reader.readAsText(raw, 'UTF-8');
};

const toMap = () => {
  if (parseResult.value) importStep.value = 1;
};

const numberOrNull = (v: string) => {
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && String(v).trim() !== '' ? n : null;
};

const toConfirm = () => {
  if (!parseResult.value) return;
  const { rows } = parseResult.value;
  const ci = (k: string) => (fieldMap as any)[k];
  const list = rows
    .map((r) => ({
      importer: ci('company') !== '' ? String(r[ci('company')] || '').trim() : '',
      email: ci('email') !== '' ? String(r[ci('email')] || '').trim() : '',
      supplier: ci('supplier') !== '' ? String(r[ci('supplier')] || '').trim() : '',
      hsCode: ci('hsCode') !== '' ? String(r[ci('hsCode')] || '').trim() : '',
      teu: ci('teu') !== '' ? numberOrNull(r[ci('teu')]) : null,
      arrivalDate: ci('arrivalDate') !== '' ? String(r[ci('arrivalDate')] || '').trim() : '',
      originCountry: ci('originCountry') !== '' ? String(r[ci('originCountry')] || '').trim() : '',
    }))
    .filter((r) => r.importer);
  pendingRecords.value = list;
  if (!list.length) {
    ElMessage.warning('没有可导入的有效行（公司名为空）');
    return;
  }
  importStep.value = 2;
};

const doImport = async () => {
  importing.value = true;
  try {
    const res: any = await api.customs.import({
      sourceKey: activeSource.value.key,
      records: pendingRecords.value,
    });
    ElMessage.success(`成功导入 ${res.imported} 条海关记录`);
    importVisible.value = false;
    loadRecords();
  } finally {
    importing.value = false;
  }
};

const viewLead = (row: any) => {
  if (row.leadId) router.push('/leads');
  else ElMessage.info('该记录未关联线索');
};

const removeRec = async (row: any) => {
  await ElMessageBox.confirm(`删除海关记录「${row.importer}」及其关联线索？`, '删除', { type: 'warning' });
  await api.customs.remove(row.id);
  ElMessage.success('已删除');
  loadRecords();
};

const downloadTemplate = () => {
  const header = '公司名/进口商,邮箱,供应商,HS编码,货量(TEU),到港日期,原产国\n';
  const sample =
    'BakerySupply Inc,import@bakerysupply.net,Smile Ice Qi Co Ltd,280420,3,2026-08-12,CN\n';
  const csv = '﻿' + header + sample;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '海关数据导入模板.csv';
  a.click();
  URL.revokeObjectURL(a.href);
};
</script>

<style scoped>
* { box-sizing: border-box; }

/* Hero 头部 */
.head-card {
  border: 1px solid #eef2f7; border-radius: 14px;
  background: #fff; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}
.head { display: flex; justify-content: space-between; align-items: center; gap: 24px; }
.head-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
.title-badge {
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  background: #eff6ff; color: #2563eb;
  display: flex; align-items: center; justify-content: center; font-size: 22px;
}
.title { font-size: 20px; font-weight: 800; color: #1f2937; margin: 0 0 6px; }
.sub { font-size: 13px; color: #64748b; line-height: 1.7; margin: 0; }
.head-right { display: flex; align-items: center; flex-shrink: 0; }
.stat { text-align: center; padding: 0 26px; border-left: 1px solid #eef2f7; }
.stat:first-child { border-left: none; padding-left: 0; }
.stat .num { font-size: 26px; font-weight: 800; color: #1f2937; line-height: 1.1; }
.stat .lab { font-size: 12px; color: #909399; margin-top: 3px; }
.head-actions { display: flex; gap: 10px; margin-left: 26px; padding-left: 26px; border-left: 1px solid #eef2f7; }

/* 面板 */
.panel { border-radius: 14px; border-color: #eef2f7; }
.panel-head, .rec-head {
  display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;
}
.panel-head :deep(.el-icon), .rec-head :deep(.el-icon) { color: #2563eb; margin-right: 6px; vertical-align: -2px; }
.legend { margin-bottom: 20px; border-radius: 10px; }

/* 数据源卡片 */
.src-col { /* 卡片上下间距由 el-row 的 row-gap 控制 */ }
.src-card {
  position: relative; border: 1px solid #eef2f7; border-radius: 14px; padding: 20px 20px 22px;
  background: #fff; height: 100%; overflow: hidden;
  display: flex; flex-direction: column;
  transition: box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease;
}
.src-card:hover { box-shadow: 0 12px 28px rgba(15, 23, 42, 0.1); transform: translateY(-2px); }
.src-card.mode-import:hover { border-color: #86efac; }
.src-card.mode-api_free:hover { border-color: #93c5fd; }
.src-card.mode-blocked:hover { border-color: #fca5a5; }
.src-card.mode-api_limited:hover { border-color: #fcd34d; }
.src-card.mode-blocked { background: #fff7f7; }

.src-head { display: flex; align-items: center; gap: 12px; }
.src-icon {
  width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 19px;
  background: #94a3b8;
}
.mode-import .src-icon { background: #16a34a; }
.mode-blocked .src-icon { background: #ef4444; }
.mode-api_limited .src-icon { background: #f59e0b; }
.mode-api_free .src-icon { background: #2563eb; }
.src-titles { flex: 1; min-width: 0; }
.src-name { font-size: 14.5px; font-weight: 700; color: #1f2937; }
.src-provider { font-size: 11.5px; color: #94a3b8; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.src-tag { flex-shrink: 0; }
.src-meta { font-size: 12px; color: #64748b; margin: 16px 0 10px; font-weight: 600; }
.src-cov {
  font-size: 12.5px; color: #475569; line-height: 1.65; margin-bottom: 16px;
  background: #f8fafc; border-radius: 9px; padding: 12px 14px;
}
.cov-label { font-size: 11px; color: #94a3b8; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 8px; text-transform: uppercase; }
.cov-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.cov-chip { font-size: 11.5px; }
.cov-text { font-size: 12.5px; color: #475569; line-height: 1.65; }
.src-hint { border-radius: 9px; }
.src-hint :deep(.el-alert__content) { line-height: 1.6; }
.src-hint :deep(.el-alert__title) { font-weight: 500; font-size: 12.5px; line-height: 1.6; }
.src-link {
  display: inline-flex; align-items: center; gap: 4px; margin: 14px 0 0;
  font-size: 13px; font-weight: 600;
}
.src-foot { margin-top: auto; border-top: 1px dashed #eef2f7; padding-top: 18px; }

.src-query { margin-top: 18px; border-top: 1px dashed #eef2f7; padding-top: 18px; }
.q-form { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.q-res { margin-top: 14px; }
.q-note { font-size: 12px; color: #64748b; line-height: 1.6; margin-bottom: 10px; }
.q-empty { font-size: 12.5px; color: #94a3b8; }

/* 已导入记录 */
.rec-filter { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.rec-head { padding-bottom: 2px; }
.rec-count { margin-left: 8px; }
.domain { color: #2563eb; font-size: 12.5px; }
.domain-empty { color: #cbd5e1; }

.imp-steps { margin-bottom: 18px; }
.imp-body { min-height: 180px; }
.up-text { font-size: 14px; color: #334155; margin: 6px 0; }
.parse-info { margin-top: 12px; font-size: 13px; color: #16a34a; }
.map-tip { font-size: 13px; color: #64748b; margin: 0 0 12px; }
.map-form { max-width: 520px; }
.more { font-size: 12px; color: #94a3b8; margin-top: 8px; }

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
