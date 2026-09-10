<template>
  <div>
    <el-row :gutter="16">
      <!-- B端关键词 -->
      <el-col :span="14">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <div class="ch-left">
                <span>B 端采购意图关键词</span>
                <el-button link type="primary" size="small" @click="helpDialog = true">
                  <el-icon><QuestionFilled /></el-icon>使用说明
                </el-button>
              </div>
              <el-button size="small" type="primary" plain @click="kwDialog = true">+ 添加关键词</el-button>
            </div>
          </template>
          <el-alert
            title="重点布局 B 端采购意图词（wholesale / supplier / manufacturer / bulk / OEM / private label），对应独立站落地页"
            type="info" :closable="false" show-icon style="margin-bottom:12px" />
          <el-table :data="keywords" size="small" stripe>
            <el-table-column prop="keyword" label="关键词" min-width="200" />
            <el-table-column label="类型" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="row.category === 'head' ? 'success' : 'info'">{{ row.category === 'head' ? '核心词' : '长尾词' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="落地页" width="130">
              <template #default="{ row }">
                <el-select
                  v-model="row.landingPage" size="small" placeholder="未指定"
                  @change="patch(row, { landingPage: row.landingPage })">
                  <el-option v-for="p in landingPaths" :key="p" :label="p" :value="p" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="排名（Google US）" width="120">
              <template #default="{ row }">
                <el-input-number
                  v-model="row.rank" size="small" :min="1" :max="100" :controls="false"
                  placeholder="未收录" style="width:96px"
                  @change="patch(row, { rank: row.rank })" />
              </template>
            </el-table-column>
            <el-table-column label="状态" width="112">
              <template #default="{ row }">
                <el-select v-model="row.status" size="small" @change="patch(row, { status: row.status })">
                  <el-option label="待收录" value="pending" />
                  <el-option label="跟踪中" value="tracking" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="70">
              <template #default="{ row }">
                <el-button link type="danger" size="small" @click="removeKw(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 落地页清单（F-E-03 精简版） -->
        <el-card shadow="never" style="margin-top:16px">
          <template #header>
            <div class="card-header">
              <div class="ch-left">
                <span>落地页清单（独立站）</span>
                <el-tag size="small" type="info" effect="plain" round>{{ siteUrl || '未配置域名' }}</el-tag>
              </div>
              <el-button size="small" type="primary" plain @click="openLp()">+ 新增页面</el-button>
            </div>
          </template>
          <el-alert
            title="每个落地页承载一组意图相同的关键词：页面必须包含合规资质（MSDS / UN-DOT）、MOQ 与阶梯报价、邮箱 + 表单 + WhatsApp，否则有排名也拿不到询盘"
            type="warning" :closable="false" show-icon style="margin-bottom:12px" />
          <el-table :data="landingPages" size="small">
            <el-table-column label="页面" min-width="220">
              <template #default="{ row }">
                <el-link :href="row.url" target="_blank" type="primary">{{ row.path }}</el-link>
                <div class="lp-title">{{ row.title }}</div>
              </template>
            </el-table-column>
            <el-table-column label="承载关键词" width="110">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{ row.keywordCount }} 个</el-tag>
                <div class="lp-meta">跟踪中 {{ row.trackedCount }}</div>
              </template>
            </el-table-column>
            <el-table-column label="转化目标" min-width="180">
              <template #default="{ row }">{{ row.goal || '—' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="112">
              <template #default="{ row }">
                <el-select v-model="row.status" size="small" @change="patchLp(row, { status: row.status })">
                  <el-option label="已上线" value="online" />
                  <el-option label="草稿" value="draft" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="110">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openLp(row)">编辑</el-button>
                <el-button link type="danger" size="small" @click="removeLp(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 否定词 -->
      <el-col :span="10">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>否定关键词（Google Ads）</span>
              <el-button size="small" type="primary" plain @click="nkDialog = true">+ 添加</el-button>
            </div>
          </template>
          <el-alert title="必加：whip charger、whip gas 等，过滤吸食相关垃圾流量，保护账号质量分"
            type="warning" :closable="false" show-icon style="margin-bottom:12px">
            <template #default>
              <el-button link type="warning" size="small" @click="helpDialog = true">为什么必加 →</el-button>
            </template>
          </el-alert>
          <el-table :data="negativeKeywords" size="small">
            <el-table-column prop="keyword" label="否定词" width="140">
              <template #default="{ row }"><span class="neg">{{ row.keyword }}</span></template>
            </el-table-column>
            <el-table-column prop="channel" label="渠道" width="110" />
            <el-table-column prop="note" label="说明" min-width="150" show-overflow-tooltip />
            <el-table-column label="操作" width="70">
              <template #default="{ row }">
                <el-button link type="danger" size="small" @click="removeNk(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-card shadow="never" style="margin-top:16px">
          <template #header>广告计划（小预算测试）</template>
          <div v-for="a in adCampaigns" :key="a.id" class="ad-item">
            <div class="ad-row">
              <span class="ad-name">{{ a.name }}</span>
              <el-tag size="small" :type="a.status === 'paused' ? 'info' : 'success'">{{ a.status === 'paused' ? '暂停' : '投放中' }}</el-tag>
            </div>
            <div class="ad-meta">日预算 ${{ a.budgetDaily }} · 花费 ${{ a.spent }} · 点击 {{ a.clicks }} · CTR {{ (a.ctr * 100).toFixed(1) }}% · 询盘 {{ a.conversions }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="kwDialog" title="添加关键词" width="500px">
      <el-form label-width="90px">
        <el-form-item label="关键词"><el-input v-model="kwForm.keyword" placeholder="bulk cream chargers for foodservice" /></el-form-item>
        <el-form-item label="类型">
          <el-select v-model="kwForm.category" style="width:100%">
            <el-option label="核心词" value="head" />
            <el-option label="长尾词" value="longtail" />
          </el-select>
        </el-form-item>
        <el-form-item label="落地页">
          <el-select v-model="kwForm.landingPage" style="width:100%">
            <el-option label="/wholesale（批发）" value="/wholesale" />
            <el-option label="/oem（贴牌）" value="/oem" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="kwDialog = false">取消</el-button>
        <el-button type="primary" @click="createKw">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="nkDialog" title="添加否定词" width="500px">
      <el-form label-width="90px">
        <el-form-item label="否定词"><el-input v-model="nkForm.keyword" placeholder="whip charger" /></el-form-item>
        <el-form-item label="渠道">
          <el-select v-model="nkForm.channel" style="width:100%">
            <el-option label="google-ads" value="google-ads" />
            <el-option label="all（全渠道）" value="all" />
          </el-select>
        </el-form-item>
        <el-form-item label="说明"><el-input v-model="nkForm.note" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="nkDialog = false">取消</el-button>
        <el-button type="primary" @click="createNk">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="lpDialog" :title="lpEditing ? '编辑落地页' : '新增落地页'" width="560px">
      <el-form label-width="100px">
        <el-form-item label="页面路径" required>
          <el-input v-model="lpForm.path" placeholder="/wholesale" />
        </el-form-item>
        <el-form-item label="页面标题">
          <el-input v-model="lpForm.title" placeholder="Wholesale Cream Chargers – Bulk Supplier USA" />
        </el-form-item>
        <el-form-item label="搜索意图">
          <el-input v-model="lpForm.intent" placeholder="批量采购 / 批发询价" />
        </el-form-item>
        <el-form-item label="转化目标">
          <el-input v-model="lpForm.goal" placeholder="提交批量报价申请（MOQ + 阶梯价）" />
        </el-form-item>
        <el-form-item label="必备模块">
          <el-select
            v-model="lpForm.modules" multiple filterable allow-create default-first-option
            placeholder="回车添加，如：合规资质 MSDS / UN-DOT" style="width:100%">
            <el-option v-for="m in modulePresets" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="lpForm.status" style="width:100%">
            <el-option label="已上线" value="online" />
            <el-option label="草稿" value="draft" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="lpDialog = false">取消</el-button>
        <el-button type="primary" @click="saveLp">保存</el-button>
      </template>
    </el-dialog>

    <!-- 使用说明 -->
    <el-dialog v-model="helpDialog" width="760px" top="6vh">
      <template #header>
        <div class="dlg-title">
          <el-icon><Key /></el-icon>
          <span>关键词库 · 使用说明</span>
          <el-tag size="small" type="info" effect="plain">F-E-01 / F-E-02</el-tag>
        </div>
      </template>
      <div class="help">
        <div class="help-lead">
          <el-icon><InfoFilled /></el-icon>
          <span>关键词库是<b>被动获客的资产台账</b>：这里维护的词，决定独立站哪些页面能被 Google 搜到、广告预算花在哪些词上。</span>
        </div>

        <section class="help-sec">
          <div class="sec-title"><span class="sec-no">1</span>这个页面管什么</div>
          <ul class="help-ul">
            <li><b>B 端采购意图关键词</b>：独立站 SEO 与 Google Ads 的布局/投放清单，是被动获客的主入口。</li>
            <li><b>落地页清单</b>：独立站页面台账。每个页面承载一组意图相同的关键词，记录转化目标与上线状态。</li>
            <li><b>否定关键词</b>：屏蔽吸食相关等垃圾流量，保护 Google Ads 账号质量分。</li>
            <li><b>广告计划</b>：记录小预算测试（$30–50/天）的花费、点击、CTR 与询盘，判断词值不值得继续投。</li>
          </ul>
        </section>

        <section class="help-sec">
          <div class="sec-title"><span class="sec-no">2</span>怎么选 B 端词</div>
          <div class="formula">
            <span class="f-part">产品词</span><span class="f-op">+</span>
            <span class="f-part">B 端意图词</span><span class="f-op">+</span>
            <span class="f-part">国家 / 场景</span>
          </div>
          <div class="formula-sub">cream charger、cream whipper、n2o charger · wholesale、supplier、manufacturer、bulk、OEM、private label · USA、for foodservice</div>
          <pre class="code">cream charger wholesale USA
food-grade n2o cream charger supplier
cream whipper OEM manufacturer
bulk whipped cream chargers for foodservice
private label cream charger manufacturer</pre>
          <ul class="help-ul">
            <li><b>核心词</b>：流量大但竞争激烈，作为落地页主词（如 cream charger wholesale USA）。</li>
            <li><b>长尾词</b>：竞争小、意图明确、转化更高，<b>建议占七成左右</b>，优先布局。</li>
          </ul>
        </section>

        <section class="help-sec">
          <div class="sec-title"><span class="sec-no">3</span>落地页怎么选</div>
          <ul class="help-ul">
            <li><code>/wholesale</code>：批量询价意图 —— bulk、wholesale price、bulk order。</li>
            <li><code>/oem</code>：贴牌代工意图 —— OEM、private label、manufacturer。</li>
            <li>词与页面必须匹配，否则跳出率高、询盘质量差。</li>
          </ul>
        </section>

        <section class="help-sec">
          <div class="sec-title"><span class="sec-no">4</span>排名与状态怎么看</div>
          <ul class="help-ul">
            <li><b>待收录</b>：刚添加，等待 Google 收录（通常 2–8 周）。</li>
            <li><b>跟踪中</b>：已开始追踪排名，需定期更新快照。</li>
            <li><b>排名</b>：Google US 搜索结果位置，<b>前 10 才算第一页</b>；当前版本手动维护，后续按周自动快照。</li>
          </ul>
        </section>

        <section class="help-sec">
          <div class="sec-title"><span class="sec-no">5</span>否定词为什么必加</div>
          <ul class="help-ul">
            <li>过滤 <code>whip charger</code>、<code>whip gas</code> 等吸食相关词，避免垃圾流量与合规风险。</li>
            <li>提升广告质量分、降低 CPC，把预算留给真实采购意图。</li>
            <li>渠道：<code>google-ads</code> 仅广告生效，<code>all</code> 为全渠道（含 SEO 与内容）。</li>
            <li>投放新市场或新词前，<b>先补否定词再开投</b>。</li>
          </ul>
        </section>

        <section class="help-sec">
          <div class="sec-title"><span class="sec-no">6</span>建议节奏</div>
          <ul class="help-ul">
            <li><b>每周</b>：补 5–10 个长尾词，检查新词收录情况。</li>
            <li><b>每月</b>：更新排名快照，对「有排名、无询盘」的词优化落地页与报价入口。</li>
            <li><b>每季</b>：复盘广告计划 CTR / 询盘，关停低效词，结论同步到数据看板的「渠道贡献」。</li>
          </ul>
        </section>

        <div class="help-warn">
          <el-icon><WarningFilled /></el-icon>
          <span>气弹只做 B 端询盘，不做零售一件代发（合规要求）；也不要把零售词（如 buy cream charger near me）当作 B 端词收录。</span>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="helpDialog = false">知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api';

const keywords = ref<any[]>([]);
const negativeKeywords = ref<any[]>([]);
const adCampaigns = ref<any[]>([]);
const kwDialog = ref(false);
const nkDialog = ref(false);
const helpDialog = ref(false);
const kwForm = reactive<any>({ keyword: '', category: 'longtail', landingPage: '/wholesale' });
const nkForm = reactive<any>({ keyword: '', channel: 'google-ads', note: '' });

// —— 落地页清单 ——
const landingPages = ref<any[]>([]);
const siteUrl = ref('');
const lpDialog = ref(false);
const lpEditing = ref<any>(null);
const lpForm = reactive<any>({ path: '', title: '', intent: '', goal: '', modules: [] as string[], status: 'draft' });
const modulePresets = ['工厂实拍与产能', '合规资质 MSDS / UN-DOT', 'MOQ 与阶梯报价表', 'OEM/ODM 流程图', '邮箱 + 表单 + WhatsApp', '贴牌案例'];
const landingPaths = computed(() => landingPages.value.map((p: any) => p.path));

// 排名 / 状态 / 落地页归属：行内改动即时保存
const patch = async (row: any, data: any) => {
  await api.keywords.update(row.id, data);
  ElMessage.success('已更新');
  load();
};

const openLp = (row?: any) => {
  lpEditing.value = row || null;
  if (row) {
    Object.assign(lpForm, {
      path: row.path, title: row.title || '', intent: row.intent || '',
      goal: row.goal || '', modules: [...(row.modules || [])], status: row.status,
    });
  } else {
    Object.assign(lpForm, { path: '', title: '', intent: '', goal: '', modules: [], status: 'draft' });
  }
  lpDialog.value = true;
};

const saveLp = async () => {
  if (!lpForm.path.trim()) return ElMessage.warning('页面路径必填');
  const raw = lpForm.path.trim();
  const payload = {
    path: raw.startsWith('/') ? raw : `/${raw}`,
    title: lpForm.title, intent: lpForm.intent, goal: lpForm.goal,
    modules: lpForm.modules, status: lpForm.status,
  };
  if (lpEditing.value) {
    await api.landing.update(lpEditing.value.id, payload);
    ElMessage.success('已更新');
  } else {
    const res = await api.landing.add(payload);
    if (res && res.ok === false) return ElMessage.warning(res.message);
    ElMessage.success('已新增');
  }
  lpDialog.value = false;
  load();
};

const patchLp = async (row: any, data: any) => {
  await api.landing.update(row.id, data);
  ElMessage.success('已更新');
  load();
};

const removeLp = async (row: any) => {
  await ElMessageBox.confirm(`删除落地页 ${row.path}？（仅解除页面登记，不影响已关联关键词）`, '删除', { type: 'warning' });
  await api.landing.remove(row.id);
  ElMessage.success('已删除');
  load();
};

const removeKw = async (row: any) => {
  await ElMessageBox.confirm(`删除关键词「${row.keyword}」？`, '删除', { type: 'warning' });
  await api.keywords.remove(row.id);
  load();
};

const createKw = async () => {
  if (!kwForm.keyword) return ElMessage.warning('关键词必填');
  await api.keywords.add(kwForm);
  ElMessage.success('已添加');
  kwDialog.value = false;
  load();
};

const removeNk = async (row: any) => {
  await ElMessageBox.confirm(`删除否定词「${row.keyword}」？`, '删除', { type: 'warning' });
  await api.keywords.removeNegative(row.id);
  load();
};

const createNk = async () => {
  if (!nkForm.keyword) return ElMessage.warning('否定词必填');
  await api.keywords.addNegative(nkForm);
  ElMessage.success('已添加');
  nkDialog.value = false;
  load();
};

const load = async () => {
  keywords.value = await api.keywords.list();
  negativeKeywords.value = await api.keywords.negative();
  const [lps, st] = await Promise.all([api.landing.list(), api.settings.get()]);
  landingPages.value = Array.isArray(lps) ? lps : [];
  siteUrl.value = st?.siteUrl || '';
  adCampaigns.value = [
    { id: 'AD001', name: 'US 批发关键词（测试）', budgetDaily: 40, spent: 320, clicks: 18, ctr: 0.145, conversions: 1, status: 'paused' },
  ];
};

onMounted(load);
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.ch-left { display: flex; align-items: center; gap: 8px; }
.lp-title { font-size: 12px; color: #909399; margin-top: 2px; line-height: 1.5; }
.lp-meta { font-size: 12px; color: #c0c4cc; margin-top: 2px; }

/* 使用说明弹窗 */
.dlg-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; color: #1f2937; }
.dlg-title .el-icon { color: #409eff; }
.help { max-height: 62vh; overflow-y: auto; padding-right: 6px; }
.help-lead {
  display: flex; gap: 8px; align-items: flex-start;
  background: #f0f7ff; border: 1px solid #d6e8ff; border-radius: 10px;
  padding: 10px 12px; color: #334155; font-size: 13px; line-height: 1.8;
}
.help-lead .el-icon { color: #409eff; margin-top: 4px; }
.help-sec { margin-top: 18px; }
.sec-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 6px; }
.sec-no {
  width: 20px; height: 20px; border-radius: 50%; background: #409eff; color: #fff;
  font-size: 12px; display: inline-flex; align-items: center; justify-content: center; flex: none;
}
.help-ul { margin: 0; padding-left: 22px; color: #4b5563; font-size: 13px; line-height: 1.9; }
.help-ul b { color: #1f2937; }
.help-ul code { background: #f1f5f9; color: #0369a1; padding: 1px 5px; border-radius: 4px; font-size: 12px; }
.formula { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.f-part {
  background: #eef6ff; border: 1px solid #d6e8ff; color: #1d4ed8;
  border-radius: 6px; padding: 3px 10px; font-size: 12px; font-weight: 600;
}
.f-op { color: #94a3b8; }
.formula-sub { font-size: 12px; color: #94a3b8; line-height: 1.7; margin-bottom: 8px; }
.code {
  margin: 0 0 10px; padding: 10px 12px; border-radius: 8px;
  background: #0f172a; color: #e2e8f0; font-size: 12px; line-height: 1.8;
  overflow-x: auto; font-family: Consolas, Monaco, monospace;
}
.help-warn {
  display: flex; gap: 8px; margin-top: 18px; padding: 10px 12px; border-radius: 10px;
  background: #fff8ea; border: 1px solid #ffe1a6; color: #92400e; font-size: 12.5px; line-height: 1.8;
}
.help-warn .el-icon { color: #e6a23c; margin-top: 4px; }
.neg { color: #e6a23c; font-weight: 600; }
.ad-item { padding: 10px 0; border-bottom: 1px solid #f0f2f5; }
.ad-row { display: flex; justify-content: space-between; align-items: center; }
.ad-name { font-weight: 600; font-size: 13px; }
.ad-meta { font-size: 12px; color: #909399; margin-top: 4px; }
</style>
