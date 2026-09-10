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
          type="primary" class="preset-tag"
          tabindex="0"
          :aria-pressed="activeSyntax === p.id"
          @click="selectPreset(p)"
          @keydown.enter="selectPreset(p)"
          @keydown.space.prevent="selectPreset(p)">
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

        <el-tag v-if="providerInfo.provider === 'mock'" size="small" type="info" effect="plain">
          当前为模拟数据，配置真实凭证后可启用真实搜索
        </el-tag>
        <template v-else-if="providerInfo.configured">
          <el-tag size="small" type="success">数据源：{{ providerInfo.label }} 已配置</el-tag>
          <el-tag size="small" effect="plain">免费额度 {{ providerInfo.label === 'SerpAPI' ? '100 次/月' : '100 次/天' }}</el-tag>
        </template>
        <template v-else>
          <el-tag size="small" type="warning">
            已启用 {{ providerInfo.label }}，缺少凭证：{{ providerInfo.missing.join('、') }}，将自动降级为模拟
          </el-tag>
        </template>

        <el-button size="small" text type="primary" @click="credDialog = true">
          <el-icon style="vertical-align:-2px"><QuestionFilled /></el-icon>
          如何获取凭证？
        </el-button>
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

    <!-- 获取真实搜索凭证说明 -->
    <el-dialog v-model="credDialog" title="如何获取真实搜索凭证" width="700px" top="6vh">
      <el-alert
        :title="credStatusText"
        :type="providerInfo.configured ? 'success' : 'warning'"
        :closable="false" show-icon style="margin-bottom:16px" />

      <el-tabs>
        <el-tab-pane label="方案 A：Google CSE（推荐）">
          <el-steps direction="vertical" :active="6" class="cred-steps">
            <el-step title="登录 Google Cloud Console">
              <template #description>
                打开 <el-link type="primary" href="https://console.cloud.google.com/" target="_blank">console.cloud.google.com</el-link>，
                用 Google 账号登录（没有则先注册）。
              </template>
            </el-step>
            <el-step title="创建项目">
              <template #description>
                顶部项目下拉框 → 新建项目（如 hunter），打开后确认当前项目是它。
              </template>
            </el-step>
            <el-step title="启用 Custom Search API">
              <template #description>
                菜单「APIs &amp; Services → Library」→ 搜索 <b>Custom Search API</b> → 启用。
              </template>
            </el-step>
            <el-step title="创建 API Key">
              <template #description>
                菜单「APIs &amp; Services → Credentials」→ Create credentials → API key → 复制保存（即
                <code>GOOGLE_CSE_KEY</code>）。
              </template>
            </el-step>
            <el-step title="创建搜索引擎拿到 cx">
              <template #description>
                打开 <el-link type="primary" href="https://programmablesearchengine.google.com/" target="_blank">programmablesearchengine.google.com</el-link>
                → 添加搜索引擎，站点任意填（如 example.com）→ 创建后复制 <b>Search engine ID</b>（即
                <code>GOOGLE_CSE_CX</code>）。如需全网搜索，在搜索引擎设置里关闭「仅限特定网站」。
              </template>
            </el-step>
            <el-step title="写入 server/.env 并重启后端">
              <template #description>
                <pre class="env-snippet">DISCOVER_PROVIDER=google
GOOGLE_CSE_KEY=你的API_KEY
GOOGLE_CSE_CX=你的搜索ID</pre>
                开发环境：<code>npm --prefix server run start:dev</code> 或根目录 <code>npm run dev</code> 会自动重启；
                Docker：<code>docker compose up -d --build</code>。
              </template>
            </el-step>
          </el-steps>
        </el-tab-pane>

        <el-tab-pane label="方案 B：SerpAPI">
          <el-steps direction="vertical" :active="4" class="cred-steps">
            <el-step title="注册 SerpAPI">
              <template #description>
                打开 <el-link type="primary" href="https://serpapi.com/" target="_blank">serpapi.com</el-link>，用 Google / GitHub 账号注册。
              </template>
            </el-step>
            <el-step title="获取 API Key">
              <template #description>
                登录后进入 Dashboard（或 Account），复制 <b>API Key</b>。免费计划 100 次/月，够日常验证；正式批量建议购买基础套餐。
              </template>
            </el-step>
            <el-step title="写入 server/.env">
              <template #description>
                <pre class="env-snippet">DISCOVER_PROVIDER=serp
SERP_API_KEY=你的API_KEY</pre>
              </template>
            </el-step>
            <el-step title="重启后端">
              <template #description>
                与方案 A 相同：重启 dev / 重新构建 Docker 容器后，回到本页刷新即生效。
              </template>
            </el-step>
          </el-steps>
        </el-tab-pane>
      </el-tabs>

      <el-alert
        title="提示：凭证仅保存在服务端 server/.env，不会暴露给浏览器；调用失败或额度用尽时自动降级为模拟数据，不影响使用。真实搜索模式下三标准校验基于真实结果判定。"
        type="info" :closable="false" show-icon style="margin-top:8px" />
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
const providerInfo = ref<{ provider: string; label: string; configured: boolean; missing: string[] }>({
  provider: 'mock', label: '模拟数据', configured: true, missing: [],
});
const results = ref<any[]>([]);
const searching = ref(false);
const checkedMap = reactive<Record<string, boolean>>({});
const selectedIds = ref<Set<string>>(new Set());
const selectAll = ref(false);
const syntaxDialog = ref(false);
const credDialog = ref(false);
const form = reactive({ name: '', syntax: '' });

const credStatusText = computed(() => {
  const p = providerInfo.value;
  if (p.provider === 'mock') {
    return '当前数据源为「模拟数据」：已预置演示结果。按下面任一方案配置真实凭证后，即可启用真实搜索。';
  }
  if (p.configured) {
    return `已启用 ${p.label}，凭证配置完整，可以正常使用真实搜索。`;
  }
  return `已启用 ${p.label}，但缺少 ${p.missing.join('、')}，当前会降级为模拟数据。请按下方流程配置后重启后端。`;
});

const selected = computed(() => results.value.filter((r) => selectedIds.value.has(r.id)));

const checkLabel = (k: string | number) => ({ check1: '①在售同类', check2: '②真实邮箱', check3: '③地图定位' } as any)[String(k)];

const gradeType = (g: string) => ({ A: 'success', B: 'warning', C: 'info' } as any)[g];

const loadPresets = async () => {
  presets.value = await api.discover.presets();
  const first = presets.value[0];
  if (first) { activeSyntax.value = first.id; syntax.value = first.syntax; }
  try {
    const p = await api.discover.provider();
    providerInfo.value = {
      provider: p.provider || 'mock',
      label: p.label || (p.provider === 'google' ? 'Google CSE' : p.provider === 'serp' ? 'SerpAPI' : '模拟数据'),
      configured: !!p.configured,
      missing: p.missing || [],
    };
    mode.value = p.provider === 'mock' ? 'mock' : 'live';
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
    ElMessage.warning('真实搜索失败，已降级为模拟数据。' + (resp.reason || ''));
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
.preset-tag:focus-visible { outline: 2px solid #409eff; outline-offset: 2px; }
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
.cred-steps :deep(.el-step__description) { font-size: 13px; color: #606266; line-height: 1.7; }
.env-snippet {
  margin: 8px 0 0;
  padding: 10px 12px;
  background: #0f172a;
  color: #a5f3fc;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.7;
  overflow-x: auto;
}
</style>
