<template>
  <div>
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span><el-icon style="vertical-align:-2px"><Search /></el-icon> 线索采集（Google 高级搜索）</span>
          <el-button type="primary" size="small" @click="openSyntaxDialog">+ 新建语法</el-button>
        </div>
      </template>

      <el-alert
        title="按《美国B2B客户开发产品文档》配置的预置语法，site:.us 限定美国网站，-alibaba -amazon 过滤 B2B 平台噪音"
        type="info" :closable="false" show-icon style="margin-bottom:16px" />

      <el-space wrap style="margin-bottom:16px">
        <el-tag
          v-for="p in presets" :key="p.id"
          :effect="activeSyntax === p.id ? 'dark' : 'plain'"
          type="primary" class="preset-tag" @click="selectPreset(p)">
          {{ p.name }}
        </el-tag>
      </el-space>

      <el-input v-model="syntax" placeholder="输入 Google 搜索语法，例如：&quot;cream charger&quot; wholesale distributor site:.us" clearable>
        <template #append>
          <el-button type="primary" :loading="searching" @click="execute">执行搜索</el-button>
        </template>
      </el-input>

      <div class="mode-row">
        <el-radio-group v-model="mode">
          <el-radio-button label="live">真实搜索</el-radio-button>
          <el-radio-button label="mock">模拟数据</el-radio-button>
        </el-radio-group>
        <el-tag v-if="provider === 'mock' && mode === 'live'" size="small" type="warning">
          后端未配置真实搜索凭证，将自动降级为模拟
        </el-tag>
        <el-tag v-else-if="provider !== 'mock'" size="small" type="success">
          数据源：{{ provider === 'google' ? 'Google CSE' : provider === 'serp' ? 'SerpAPI' : provider }}
        </el-tag>
      </div>

      <div class="result-toolbar" v-if="results.length">
        <div class="checks-legend">
          三标准校验：
          <el-tag size="small">① 官网在售同类产品</el-tag>
          <el-tag size="small">② 有真实邮箱</el-tag>
          <el-tag size="small">③ 地图可定位</el-tag>
        </div>
        <div>
          <el-checkbox v-model="selectAll" @change="toggleAll">全选</el-checkbox>
          <el-button type="success" size="small" :disabled="!selected.length" @click="importSelected">校验并入库（{{ selected.length }}）</el-button>
        </div>
      </div>
    </el-card>

    <!-- 搜索结果 -->
    <el-card shadow="never" style="margin-top:16px">
      <template #header>搜索结果 <el-tag v-if="results.length" size="small">{{ results.length }} 条</el-tag></template>
      <el-empty v-if="!results.length && !searching" description="选择上方语法或输入语法后点击执行搜索" />
      <div v-else>
        <div v-for="r in results" :key="r.id" class="result-item" :class="{ selected: selectedIds.has(r.id) }">
          <div class="result-left">
            <el-checkbox v-model="checkedMap[r.id]" @change="() => syncSelected()" />
          </div>
          <div class="result-body">
            <div class="result-title">
              <el-link :href="r.url" target="_blank" type="primary">{{ r.title }}</el-link>
              <el-tag size="small" :type="gradeType(r.grade)">{{ r.grade }} · {{ r.score }}分</el-tag>
            </div>
            <div class="result-desc">{{ r.desc }}</div>
            <div class="result-meta">
              <span><el-icon><Location /></el-icon> {{ r.city }}</span>
              <span v-for="(ok, key) in r.checks" :key="key" :class="ok ? 'ok' : 'fail'">
                {{ checkLabel(key) }}：{{ ok ? '✓' : '✗' }}
              </span>
              <span class="syntax-note">语法：{{ r.syntax || '自定义' }}</span>
            </div>
          </div>
          <div class="result-action">
            <el-button size="small" type="primary" plain @click="quickAdd(r)">单条入库</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="syntaxDialog" title="自定义搜索语法" width="560px">
      <el-form label-width="90px">
        <el-form-item label="名称"><el-input v-model="form.name" placeholder="例如：加州甜品店批发商" /></el-form-item>
        <el-form-item label="语法">
          <el-input v-model="form.syntax" type="textarea" :rows="3" placeholder='"cream charger" wholesale distributor site:.us -alibaba' />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="syntaxDialog = false">取消</el-button>
        <el-button type="primary" @click="saveSyntax">保存并执行</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api';

const presets = ref<any[]>([]);
const activeSyntax = ref<string>('S1');
const syntax = ref('');
const mode = ref<string>('mock');
const provider = ref<string>('mock');
const results = ref<any[]>([]);
const searching = ref(false);
const checkedMap = reactive<Record<string, boolean>>({});
const selectedIds = ref<Set<string>>(new Set());
const selectAll = ref(false);
const syntaxDialog = ref(false);
const form = reactive({ name: '', syntax: '' });

const selected = computed(() => results.value.filter((r) => selectedIds.value.has(r.id)));

const checkLabel = (k: string | number) => ({ check1: '①在售同类', check2: '②真实邮箱', check3: '③地图定位' } as any)[String(k)];

const gradeType = (g: string) => ({ A: 'success', B: 'warning', C: 'info' } as any)[g];

const loadPresets = async () => {
  presets.value = await api.discover.presets();
  const first = presets.value[0];
  if (first) { activeSyntax.value = first.id; syntax.value = first.syntax; }
  try {
    const p = await api.discover.provider();
    provider.value = p.provider || 'mock';
    mode.value = provider.value === 'mock' ? 'mock' : 'live';
  } catch { /* 忽略，默认 mock */ }
};

const selectPreset = (p: any) => {
  activeSyntax.value = p.id;
  syntax.value = p.syntax;
};

const execute = async () => {
  if (!syntax.value) return ElMessage.warning('请输入搜索语法');
  searching.value = true;
  const resp: any = await api.discover.execute({ syntax: syntax.value, mode: mode.value });
  let list = resp;
  if (resp && resp.data) { // 降级结构 { degraded, reason, data }
    ElMessage.warning('真实搜索失败，已降级为模拟数据：' + (resp.reason || ''));
    list = resp.data;
  }
  results.value = list || [];
  Object.keys(checkedMap).forEach((k) => delete checkedMap[k]);
  selectedIds.value = new Set();
  selectAll.value = false;
  searching.value = false;
  if (!results.value.length) ElMessage.info('无搜索结果');
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

const quickAdd = async (r: any) => {
  await api.leads.create({
    companyName: r.title.split('|')[0].trim(),
    domain: new URL(r.url).hostname.replace('www.', ''),
    email: r.hasEmail ? 'sales@' + new URL(r.url).hostname.replace('www.', '') : null,
    source: 'google', sourceNote: '采集页单条入库',
    check1: r.checks.check1, check2: r.checks.check2, check3: r.checks.check3,
    score: r.score, custType: 'importer',
  });
  ElMessage.success('已入库');
};

const importSelected = async () => {
  await ElMessageBox.confirm(`确认将 ${selected.value.length} 条线索校验并入库？`, '批量入库', { type: 'info' });
  const items = selected.value.map((r: any) => ({
    companyName: r.title.split('|')[0].trim(),
    domain: new URL(r.url).hostname.replace('www.', ''),
    email: r.hasEmail ? 'sales@' + new URL(r.url).hostname.replace('www.', '') : null,
    source: 'google', sourceNote: '采集页批量入库',
    check1: r.checks.check1, check2: r.checks.check2, check3: r.checks.check3,
    score: r.score, custType: 'importer',
  }));
  const res = await api.leads.import({ items });
  ElMessage.success(`成功入库 ${res.imported} 条线索`);
  results.value = [];
};

const openSyntaxDialog = () => { form.name = ''; form.syntax = ''; syntaxDialog.value = true; };

const saveSyntax = async () => {
  if (!form.syntax) return ElMessage.warning('请输入语法');
  presets.value.push({ id: 'S_' + Date.now(), name: form.name || '自定义语法', syntax: form.syntax });
  syntax.value = form.syntax;
  syntaxDialog.value = false;
  ElMessage.success('已保存，可直接执行');
};

loadPresets();
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.mode-row { display: flex; align-items: center; gap: 12px; margin: 12px 0 4px; flex-wrap: wrap; }
.preset-tag { cursor: pointer; }
.result-toolbar { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 6px; }
.checks-legend { display: flex; gap: 8px; align-items: center; font-size: 12px; color: #909399; flex-wrap: wrap; }
.result-item { display: flex; gap: 12px; padding: 14px 10px; border-bottom: 1px solid #f0f2f5; align-items: flex-start; }
.result-item.selected { background: #f0f7ff; }
.result-title { display: flex; align-items: center; gap: 8px; }
.result-desc { font-size: 13px; color: #606266; margin: 6px 0; }
.result-meta { display: flex; gap: 14px; font-size: 12px; color: #909399; flex-wrap: wrap; align-items: center; }
.result-meta .ok { color: #67c23a; }
.result-meta .fail { color: #f56c6c; }
.syntax-note { color: #c0c4cc; }
</style>
