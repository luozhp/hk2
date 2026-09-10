<template>
  <div>
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span><el-icon style="vertical-align:-2px"><Trophy /></el-icon> 国际专业展会（展商名单自动拉取）</span>
          <el-button type="primary" size="small" @click="goLeads">查看展会线索</el-button>
        </div>
      </template>

      <el-alert
        title="从广交会及海外行业展（NRA / Anuga / HostMilano / Gulfood / FHA / IFFA 等）的官方参展商名录自动拉取展商，评分后一键入库为线索。"
        type="info" :closable="false" show-icon style="margin-bottom:16px" />

      <el-row :gutter="16">
        <!-- 左侧：展会列表 -->
        <el-col :xs="24" :sm="9" :md="8">
          <div class="fair-list-head">
            <span class="fair-hint">选择展会（点击拉取展商名单）</span>
            <el-button size="small" type="primary" plain @click="openCreate">+ 新增</el-button>
          </div>
          <div
            v-for="f in fairs"
            :key="f.id"
            class="fair-card"
            :class="{ active: activeFair?.id === f.id }"
            @click="selectFair(f)"
          >
            <div class="fair-head">
              <div class="fair-name">{{ f.name }}</div>
              <div class="fair-ops" @click.stop>
                <el-tag v-if="f.isOngoing" size="small" type="danger" effect="dark" class="live-tag">● 进行中</el-tag>
                <el-tag v-if="f.fetchable" size="small" type="success" effect="dark">可拉取</el-tag>
                <el-button link size="small" @click.stop="openEdit(f)">编辑</el-button>
                <el-button link size="small" type="danger" @click.stop="removeFair(f)">删除</el-button>
              </div>
            </div>
            <div class="fair-sub">{{ f.enName }} · {{ f.region }}</div>
            <div class="fair-meta"><span class="meta-ind">{{ f.industry }}</span><span class="meta-sep">·</span>{{ f.period }}</div>
            <div class="fair-date" v-if="f.dateStart && f.dateEnd" :class="'st-' + fairDateStatus(f)">
              <span class="dot"></span>
              <span class="txt">{{ f.dateStart }} ~ {{ f.dateEnd }}</span>
              <span class="badge">{{ statusLabel(f) }}</span>
            </div>
            <div class="fair-foot">
              <el-link :href="f.website" target="_blank" type="primary" :underline="false" @click.stop>
                <el-icon style="vertical-align:-2px"><Link /></el-icon> 官网
              </el-link>
              <el-tooltip :content="f.note" placement="top">
                <el-icon class="fair-info"><InfoFilled /></el-icon>
              </el-tooltip>
            </div>
          </div>
          <el-button style="width:100%;margin-top:10px" size="small" @click="discoverVisible = true">🔍 发现展会（搜索添加）</el-button>
        </el-col>

        <!-- 右侧：展商名单 -->
        <el-col :xs="24" :sm="15" :md="16">
          <el-empty v-if="!activeFair" description="请先在左侧选择展会" />

          <template v-else>
            <el-card shadow="never" class="toolbar">
              <div class="toolbar-row">
                <div>
                  <span class="active-fair">{{ activeFair.name }}</span>
                  <el-select v-model="selectedProvider" size="small" style="width:160px;margin-left:8px">
                    <el-option
                      v-for="p in providersList"
                      :key="p.provider"
                      :label="p.label + (p.provider !== 'mock' && !p.configured ? '（缺凭证）' : '')"
                      :value="p.provider"
                    />
                  </el-select>
                  <el-tag v-if="selectedProvider === 'mock'" size="small" type="info" effect="plain" style="margin-left:8px">
                    模拟数据
                  </el-tag>
                  <el-tag v-else-if="currentProvider.configured" size="small" type="success" style="margin-left:8px">
                    {{ currentProvider.label }} 已配置
                  </el-tag>
                  <el-tag v-else size="small" type="warning" style="margin-left:8px">
                    {{ currentProvider.label }} 缺凭证（{{ currentProvider.missing.join('、') }}）
                  </el-tag>
                </div>
                <div class="toolbar-actions">
                  <el-button type="primary" :loading="loading" @click="fetchExhibitors">拉取展商名单</el-button>
                </div>
              </div>
              <el-divider style="margin:12px 0" />
              <div class="hints-row">
                <span class="hints-label">① 在售同类判定词：</span>
                <el-tag
                  v-for="(h, i) in editHints"
                  :key="h"
                  closable
                  size="small"
                  type="primary"
                  effect="plain"
                  @close="removeHint(i)"
                >{{ h }}</el-tag>
                <el-input
                  v-if="hintInputVisible"
                  v-model="hintInput"
                  size="small"
                  style="width:140px"
                  placeholder="输入关键词回车"
                  @keyup.enter="confirmHint"
                  @blur="confirmHint"
                />
                <el-button v-else size="small" @click="showHintInput">+ 关键词</el-button>
                <el-button v-if="hintsIsCustom" size="small" type="text" @click="resetHints">恢复默认</el-button>
              </div>
            </el-card>

            <el-card shadow="never" style="margin-top:16px">
              <template #header>
                展商名单
                <el-tag v-if="exhibitors.length" size="small">{{ exhibitors.length }} 条</el-tag>
                <span v-if="fetchedSyntax" class="syntax-note">语法：{{ fetchedSyntax }}</span>
              </template>

              <el-empty v-if="!exhibitors.length && !loading" description="点击「拉取展商名单」获取该展会参展商" />

              <template v-else>
                <div class="batch-bar">
                  <span class="checks-legend">
                    三标准：
                    <el-tag size="small">① 在售同类</el-tag>
                    <el-tag size="small">② 真实邮箱</el-tag>
                    <el-tag size="small">③ 可定位</el-tag>
                  </span>
                  <div>
                    <el-button
                      type="success"
                      size="small"
                      :disabled="!selected.length"
                      @click="importSelected"
                    >批量入库（{{ selected.length }}）</el-button>
                  </div>
                </div>

                <el-table :data="exhibitors" row-key="id" @selection-change="onSelect" style="margin-top:8px">
                  <el-table-column type="selection" width="46" />
                  <el-table-column label="公司 / 展商" min-width="220">
                    <template #default="{ row }">
                      <el-link :href="row.url" target="_blank" type="primary">{{ row.title }}</el-link>
                      <div class="row-desc">{{ row.desc }}</div>
                    </template>
                  </el-table-column>
                  <el-table-column label="地区" width="150">
                    <template #default="{ row }">
                      {{ row.city || '—' }} · {{ row.country }}
                    </template>
                  </el-table-column>
                  <el-table-column label="三标准" width="150">
                    <template #default="{ row }">
                      <div class="chk">
                        <span :class="row.checks.check1 ? 'ok' : 'fail'">①{{ row.checks.check1 ? '✓' : '✗' }}</span>
                        <span :class="row.checks.check2 ? 'ok' : 'fail'">②{{ row.checks.check2 ? '✓' : '✗' }}</span>
                        <span :class="row.checks.check3 ? 'ok' : 'fail'">③{{ row.checks.check3 ? '✓' : '✗' }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="评分" width="100">
                    <template #default="{ row }">
                      <el-tag size="small" :type="gradeType(row.grade)">{{ row.grade }} · {{ row.score }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="100" fixed="right">
                    <template #default="{ row }">
                      <el-button size="small" type="primary" plain @click="quickAdd(row)">入库</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </template>
            </el-card>
          </template>
        </el-col>
      </el-row>

      <!-- 展会新增 / 编辑 -->
      <el-dialog v-model="fairDialog" :title="editingId ? '编辑展会' : '新增展会'" width="520px">
        <el-form :model="fairForm" label-width="92px">
          <el-form-item label="名称"><el-input v-model="fairForm.name" placeholder="中文名，如 广交会" /></el-form-item>
          <el-form-item label="英文名"><el-input v-model="fairForm.enName" placeholder="如 Canton Fair（用于搜索语法）" /></el-form-item>
          <el-form-item label="地区"><el-input v-model="fairForm.region" placeholder="如 中国 · 广州" /></el-form-item>
          <el-form-item label="行业"><el-input v-model="fairForm.industry" placeholder="如 食品机械" /></el-form-item>
          <el-form-item label="城市"><el-input v-model="fairForm.city" /></el-form-item>
          <el-form-item label="国家"><el-input v-model="fairForm.country" placeholder="CN / US / DE ..." /></el-form-item>
          <el-form-item label="官网"><el-input v-model="fairForm.website" placeholder="https://..." /></el-form-item>
          <el-form-item label="周期"><el-input v-model="fairForm.period" placeholder="如 每年 5 月" /></el-form-item>
          <el-form-item label="举办日期">
            <el-date-picker v-model="fairDateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" />
          </el-form-item>
          <el-form-item label="备注"><el-input v-model="fairForm.note" type="textarea" :rows="2" /></el-form-item>
          <el-form-item label="同类关键词">
            <el-tag v-for="(h, i) in fairForm.productHints" :key="h" closable size="small" @close="fairForm.productHints.splice(i, 1)">{{ h }}</el-tag>
            <el-input v-if="fairHintInputVisible" v-model="fairHintInput" size="small" style="width:120px" @keyup.enter="confirmFairHint" @blur="confirmFairHint" />
            <el-button v-else size="small" @click="fairHintInputVisible = true">+ 词</el-button>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="fairDialog = false">取消</el-button>
          <el-button type="primary" @click="saveFair">保存</el-button>
        </template>
      </el-dialog>

      <!-- 发现展会 -->
      <el-dialog v-model="discoverVisible" title="发现展会（按关键词搜索候选）" width="560px">
        <el-input v-model="discoverKeyword" placeholder="如 food exhibition 2026、酒店餐饮展" @keyup.enter="discoverSearch">
          <template #append><el-button @click="discoverSearch">搜索</el-button></template>
        </el-input>
        <el-alert v-if="discoverList.length" :title="`找到 ${discoverList.length} 个候选，点「选用」可带入表单`" type="success" :closable="false" style="margin:10px 0" />
        <div v-for="(c, i) in discoverList" :key="i" class="discover-item">
          <div>
            <div class="discover-title">{{ c.title }}</div>
            <div class="discover-url">{{ c.url }}</div>
          </div>
          <el-button size="small" type="primary" plain @click="useCandidate(c)">选用</el-button>
        </div>
      </el-dialog>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api';

const router = useRouter();

const fairs = ref<any[]>([]);
const activeFair = ref<any>(null);
const providersList = ref<any[]>([]);
const selectedProvider = ref<string>('mock');
const currentProvider = computed(
  () => providersList.value.find((p) => p.provider === selectedProvider.value) || { provider: 'mock', label: '模拟数据', configured: true, missing: [] },
);
const exhibitors = ref<any[]>([]);
const loading = ref(false);
const fetchedSyntax = ref('');
const selected = ref<any[]>([]);
const editHints = ref<string[]>([]);
const hintInputVisible = ref(false);
const hintInput = ref('');
const hintsIsCustom = ref(false);

const gradeType = (g: string) => ({ A: 'success', B: 'warning', C: 'info' } as any)[g];

const fairDateStatus = (f: any) => {
  if (!f?.dateStart || !f?.dateEnd) return '';
  const now = new Date();
  const start = new Date(`${f.dateStart}T00:00:00`);
  const end = new Date(`${f.dateEnd}T23:59:59`);
  if (now >= start && now <= end) return 'live';
  if (now < start) return 'upcoming';
  return 'past';
};
const statusLabel = (f: any) => {
  const s = fairDateStatus(f);
  return s === 'live' ? '进行中' : s === 'upcoming' ? '即将开始' : s === 'past' ? '已结束' : '';
};

const fairDialog = ref(false);
const editingId = ref('');
const fairForm = reactive({ name: '', enName: '', region: '', industry: '', city: '', country: '', website: '', period: '', dateStart: '', dateEnd: '', note: '', productHints: [] as string[] });
const fairHintInputVisible = ref(false);
const fairHintInput = ref('');
const fairDateRange = computed({
  get: () => (fairForm.dateStart && fairForm.dateEnd ? [fairForm.dateStart, fairForm.dateEnd] : []),
  set: (v: any) => {
    if (v && v.length === 2) {
      fairForm.dateStart = v[0];
      fairForm.dateEnd = v[1];
    } else {
      fairForm.dateStart = '';
      fairForm.dateEnd = '';
    }
  },
});

const openCreate = () => {
  editingId.value = '';
  Object.assign(fairForm, { name: '', enName: '', region: '', industry: '', city: '', country: '', website: '', period: '', dateStart: '', dateEnd: '', note: '', productHints: [] });
  fairDialog.value = true;
};
const openEdit = (f: any) => {
  editingId.value = f.id;
  Object.assign(fairForm, { name: f.name, enName: f.enName, region: f.region, industry: f.industry, city: f.city, country: f.country, website: f.website, period: f.period, dateStart: f.dateStart || '', dateEnd: f.dateEnd || '', note: f.note, productHints: [...(f.productHints || [])] });
  fairDialog.value = true;
};
const confirmFairHint = () => {
  const v = fairHintInput.value.trim();
  fairHintInputVisible.value = false;
  fairHintInput.value = '';
  if (v && !fairForm.productHints.includes(v)) fairForm.productHints.push(v);
};
const saveFair = async () => {
  if (!fairForm.name && !fairForm.enName) return ElMessage.warning('请填写名称');
  try {
    if (editingId.value) {
      await api.expo.updateFair(editingId.value, { ...fairForm });
      ElMessage.success('已更新');
    } else {
      await api.expo.createFair({ ...fairForm });
      ElMessage.success('已新增');
    }
    fairDialog.value = false;
    await loadFairs();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '保存失败');
  }
};
const removeFair = async (f: any) => {
  await ElMessageBox.confirm(`确认删除展会「${f.name}」？`, '删除', { type: 'warning' });
  try {
    await api.expo.deleteFair(f.id);
    if (activeFair.value?.id === f.id) {
      activeFair.value = null;
      exhibitors.value = [];
    }
    await loadFairs();
    ElMessage.success('已删除');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '删除失败');
  }
};

const discoverVisible = ref(false);
const discoverKeyword = ref('');
const discoverList = ref<any[]>([]);
const discoverSearch = async () => {
  if (!discoverKeyword.value.trim()) return;
  discoverList.value = [];
  try {
    discoverList.value = await api.expo.discover({ q: discoverKeyword.value, mode: selectedProvider.value });
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '搜索失败（需配置 Google / SerpAPI 凭证）');
  }
};
const useCandidate = (c: any) => {
  editingId.value = '';
  Object.assign(fairForm, { name: c.title, enName: c.title, region: '', industry: '', city: '', country: '', website: c.url, period: '', dateStart: '', dateEnd: '', note: c.snippet || '', productHints: [] });
  discoverVisible.value = false;
  fairDialog.value = true;
};

const loadFairs = async () => {
  fairs.value = await api.expo.fairs();
  try {
    const list: any[] = await api.expo.providers();
    providersList.value = list;
    const configuredReal = list.find((p) => p.provider !== 'mock' && p.configured);
    selectedProvider.value = configuredReal ? configuredReal.provider : 'mock';
  } catch { /* 忽略，默认 mock */ }
};

const selectFair = async (f: any) => {
  activeFair.value = f;
  fetchedSyntax.value = '';
  exhibitors.value = [];
  selected.value = [];
  await loadHints(f.id);
  fetchExhibitors();
};

const loadHints = async (fairId: string) => {
  try {
    const r: any = await api.expo.hints({ fairId });
    editHints.value = [...(r.hints || [])];
    hintsIsCustom.value = !!r.isCustom;
  } catch {
    editHints.value = [];
  }
};

const showHintInput = () => {
  hintInputVisible.value = true;
};

const confirmHint = async () => {
  const v = hintInput.value.trim();
  hintInputVisible.value = false;
  hintInput.value = '';
  if (!v || editHints.value.includes(v)) return;
  editHints.value.push(v);
  await persistHints();
};

const removeHint = async (i: number) => {
  editHints.value.splice(i, 1);
  await persistHints();
};

const resetHints = async () => {
  if (!activeFair.value) return;
  const r: any = await api.expo.hints({ fairId: activeFair.value.id });
  editHints.value = [...(r.default || [])];
  hintsIsCustom.value = false;
  await persistHints();
};

const persistHints = async () => {
  if (!activeFair.value) return;
  await api.expo.saveHints({ fairId: activeFair.value.id, hints: editHints.value });
};

const fetchExhibitors = async () => {
  if (!activeFair.value) return ElMessage.warning('请先选择展会');
  const useMode = selectedProvider.value;
  if (useMode !== 'mock' && !currentProvider.value.configured) {
    ElMessage.warning(`未配置 ${currentProvider.value.label} 凭证（${currentProvider.value.missing.join('、')}），请在 server/.env 配置后重启后端`);
  }
  loading.value = true;
  try {
    const resp: any = await api.expo.exhibitors({ fairId: activeFair.value.id, mode: useMode });
    exhibitors.value = resp.results || [];
    fetchedSyntax.value = resp.syntax || '';
    if (!exhibitors.value.length) ElMessage.info('该展会暂无拉取到的展商');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '拉取失败');
  } finally {
    loading.value = false;
  }
};

const onSelect = (rows: any[]) => {
  selected.value = rows;
};

const quickAdd = async (r: any) => {
  const domain = r.domain || (() => { try { return new URL(r.url).hostname.replace('www.', ''); } catch { return ''; } })();
  await api.leads.create({
    companyName: r.title,
    domain,
    email: r.email || (domain ? `sales@${domain}` : null),
    source: 'expo',
    sourceNote: `展会名录 · ${activeFair.value.name}`,
    check1: r.checks.check1, check2: r.checks.check2, check3: r.checks.check3,
    score: r.score, custType: 'importer',
  });
  ElMessage.success('已入库');
};

const importSelected = async () => {
  await ElMessageBox.confirm(`确认将 ${selected.value.length} 家展商入库为线索？`, '批量入库', { type: 'info' });
  const records = selected.value.map((r) => {
    const domain = r.domain || (() => { try { return new URL(r.url).hostname.replace('www.', ''); } catch { return ''; } })();
    return {
      companyName: r.title,
      domain,
      email: r.email || (domain ? `sales@${domain}` : null),
      city: r.city,
      country: r.country,
      score: r.score,
      check1: r.checks.check1, check2: r.checks.check2, check3: r.checks.check3,
    };
  });
  const res: any = await api.expo.import({ fairId: activeFair.value.id, fairName: activeFair.value.name, records });
  ElMessage.success(`成功入库 ${res.imported} 条线索`);
  exhibitors.value = [];
  selected.value = [];
  fetchedSyntax.value = '';
};

const goLeads = () => router.push('/leads');

loadFairs();
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.fair-hint { font-size: 13px; color: #909399; margin-bottom: 10px; }
.fair-card {
  position: relative;
  border: 1px solid #ebeef5;
  border-left: 3px solid transparent;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 10px;
  cursor: pointer;
  background: #fff;
  transition: border-color .2s, box-shadow .2s, transform .15s;
}
.fair-card:hover {
  border-color: #c6d9f5;
  box-shadow: 0 6px 16px rgba(64, 158, 255, .12);
  transform: translateY(-1px);
}
.fair-card.active {
  border-color: #409eff;
  border-left-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, .18);
  background: #f5faff;
}
.fair-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.fair-name { font-size: 14.5px; font-weight: 600; color: #1f2937; line-height: 1.4; }
.fair-sub { font-size: 12px; color: #606266; margin-top: 4px; }
.fair-meta { font-size: 12px; color: #909399; margin-top: 3px; }
.fair-meta .meta-ind { color: #409eff; }
.fair-meta .meta-sep { margin: 0 5px; color: #dcdfe6; }
.fair-date {
  display: flex; align-items: center; gap: 7px;
  margin-top: 9px; padding: 5px 9px;
  border-radius: 8px; background: #f5f7fa;
  font-size: 12px; color: #606266;
}
.fair-date .dot { width: 7px; height: 7px; border-radius: 50%; background: #c0c4cc; flex: none; }
.fair-date .txt { font-variant-numeric: tabular-nums; }
.fair-date .badge { margin-left: auto; padding: 1px 8px; border-radius: 10px; font-size: 11px; background: rgba(0,0,0,.05); color: #909399; white-space: nowrap; }
.fair-date.st-live { background: #eafaf0; color: #1f8a4c; }
.fair-date.st-live .dot { background: #19be6b; animation: fairPulse 1.6s infinite; }
.fair-date.st-live .badge { background: rgba(25,190,107,.16); color: #19be6b; }
.fair-date.st-upcoming { background: #eef4ff; color: #2f6bff; }
.fair-date.st-upcoming .dot { background: #409eff; }
.fair-date.st-upcoming .badge { background: rgba(64,158,255,.16); color: #409eff; }
.fair-date.st-past { background: #f5f5f5; color: #909399; }
.fair-date.st-past .dot { background: #c0c4cc; }
.fair-foot { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
.fair-info { color: #c0c4cc; cursor: help; transition: color .2s; }
.fair-info:hover { color: #409eff; }
.live-tag { animation: fairTagPulse 1.8s infinite; }
@keyframes fairPulse {
  0% { box-shadow: 0 0 0 0 rgba(25,190,107,.45); }
  70% { box-shadow: 0 0 0 6px rgba(25,190,107,0); }
  100% { box-shadow: 0 0 0 0 rgba(25,190,107,0); }
}
@keyframes fairTagPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .72; }
}
.toolbar-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.active-fair { font-size: 15px; font-weight: 600; color: #1f2937; }
.toolbar-actions { display: flex; align-items: center; gap: 10px; }
.batch-bar { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #f8fafc; border-radius: 6px; }
.checks-legend { display: flex; gap: 8px; align-items: center; font-size: 12px; color: #909399; }
.row-desc { font-size: 12px; color: #909399; margin-top: 2px; }
.chk { display: flex; gap: 6px; font-size: 12px; }
.chk .ok { color: #67c23a; }
.chk .fail { color: #f56c6c; }
.syntax-note { font-size: 12px; color: #c0c4cc; margin-left: 10px; }
.hints-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.hints-label { font-size: 13px; color: #606266; white-space: nowrap; }
.fair-list-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.fair-ops { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
.discover-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border: 1px solid #ebeef5; border-radius: 8px; margin-bottom: 8px; }
.discover-title { font-size: 13px; font-weight: 600; color: #1f2937; }
.discover-url { font-size: 12px; color: #909399; word-break: break-all; max-width: 360px; }
</style>
