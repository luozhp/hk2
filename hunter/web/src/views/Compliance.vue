<template>
  <div>
    <!-- 合规检查清单 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>合规检查清单 <el-tag size="small" type="success">{{ doneCount }}/{{ checklist.length }} 已完成</el-tag></span>
        </div>
      </template>
      <el-progress :percentage="Math.round((doneCount / Math.max(1, checklist.length)) * 100)" :stroke-width="12" style="margin-bottom:16px" />
      <el-row :gutter="12">
        <el-col :span="8" v-for="c in checklist" :key="c.key" style="margin-bottom:12px">
          <div class="check-item" :class="{ done: c.done }" @click="toggle(c)">
            <el-icon v-if="c.done" color="#67c23a" size="18"><CircleCheck /></el-icon>
            <el-icon v-else size="18"><CircleCheck /></el-icon>
            <div class="check-info">
              <div class="check-label">{{ c.label }}</div>
              <el-tag size="small" effect="plain">{{ c.module }}</el-tag>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-row :gutter="16" style="margin-top:16px">
      <!-- 合规文档库 -->
      <el-col :span="14">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>合规文档库（MSDS / UN / DOT / FDA / ISO）</span>
              <div style="display:flex;align-items:center;gap:4px">
                <el-button size="small" text type="primary" @click="helpDialog = true">
                  <el-icon style="vertical-align:-2px"><QuestionFilled /></el-icon>
                  说明
                </el-button>
                <el-button size="small" type="primary" plain @click="docDialog = true">+ 上传文档</el-button>
              </div>
            </div>
          </template>
          <el-table :data="docs" size="small">
            <el-table-column label="文档类型" width="100">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{ row.docType }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="名称" min-width="200" show-overflow-tooltip />
            <el-table-column prop="version" label="版本" width="80" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="row.status === 'valid' ? 'success' : 'danger'">{{ row.status === 'valid' ? '有效' : '即将到期' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="有效期" width="110">
              <template #default="{ row }">{{ row.expireDate }}</template>
            </el-table-column>
            <el-table-column label="链接" width="90">
              <template #default="{ row }">
                <el-link :href="row.publicLink" target="_blank" type="primary" :disabled="row.status !== 'valid'">查看</el-link>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="70">
              <template #default="{ row }">
                <el-button link type="danger" size="small" @click="removeDoc(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 禁词库 -->
      <el-col :span="10">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>禁词库（合规红线）</span>
              <el-button size="small" type="primary" plain @click="wordDialog = true">+ 添加禁词</el-button>
            </div>
          </template>
          <el-alert
            title="全渠道（邮件/广告/落地页/社媒）统一扫描。禁止出现 recreational / whip gas 等吸食相关词汇，统一使用 culinary / foodservice / bakery / café 口径。"
            type="error" :closable="false" show-icon style="margin-bottom:12px" />
          <el-table :data="words" size="small">
            <el-table-column prop="word" label="禁词" width="130">
              <template #default="{ row }"><span class="word">{{ row.word }}</span></template>
            </el-table-column>
            <el-table-column prop="replacement" label="建议替换" min-width="140" />
            <el-table-column label="操作" width="70">
              <template #default="{ row }">
                <el-button link type="danger" size="small" @click="removeWord(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 文案扫描 -->
        <el-card shadow="never" style="margin-top:16px">
          <template #header>文案扫描工具</template>
          <el-input v-model="scanText" type="textarea" :rows="3" placeholder="粘贴要检查的文案，例如邮件正文、落地页描述…" />
          <el-button type="primary" size="small" style="margin-top:8px" @click="doScan">扫描</el-button>
          <el-alert v-if="scanResult" :type="scanResult.ok ? 'success' : 'error'" :title="scanResult.ok ? '扫描通过，未发现禁词' : '发现禁词！'" :closable="false" style="margin-top:8px">
            <template v-if="!scanResult.ok">
              <div v-for="h in scanResult.hits" :key="h.id" style="font-size:12px;margin-top:4px">
                「{{ h.word }}」 → 建议替换为「{{ h.replacement }}」
              </div>
            </template>
          </el-alert>
        </el-card>
      </el-col>
    </el-row>

    <!-- 合规文档库说明 -->
    <el-dialog v-model="helpDialog" title="合规文档库说明" width="780px" top="5vh">
      <el-alert
        title="这些是出口合规的基础文件：目的国清关、跨境平台上架、海外客户（采购 / 质检 / 验厂）审核都会查验。登记后请确保文件处于有效期内，页面标记为「即将到期」的文档应及时更新。"
        type="info" :closable="false" show-icon style="margin-bottom:12px" />
      <el-collapse v-model="helpActive" accordion>
        <el-collapse-item v-for="h in docHelp" :key="h.type" :name="h.type">
          <template #title>
            <span style="display:flex;align-items:center;gap:8px">
              <el-tag size="small" effect="plain">{{ h.type }}</el-tag>
              {{ h.title }}
            </span>
          </template>
          <el-descriptions :column="1" size="small" border>
            <el-descriptions-item label="是什么">{{ h.what }}</el-descriptions-item>
            <el-descriptions-item label="作用 / 适用场景">
              <ul class="doc-list"><li v-for="(u, i) in h.usage" :key="i">{{ u }}</li></ul>
            </el-descriptions-item>
            <el-descriptions-item label="如何获取">
              <ul class="doc-list"><li v-for="(s, i) in h.how" :key="i">{{ s }}</li></ul>
            </el-descriptions-item>
          </el-descriptions>
        </el-collapse-item>
      </el-collapse>
      <el-alert
        title="使用提示：① MSDS 必须与每批货物成分一致，配方变更即作废旧版本；② 文档需在有效期内使用，平台与海关会拦截过期文件；③ 建议按客户与目的国归档，出货时随附对应文件。"
        type="warning" :closable="false" show-icon style="margin-top:12px" />
    </el-dialog>

    <!-- 上传文档 -->
    <el-dialog v-model="docDialog" title="上传合规文档" width="520px">
      <el-form label-width="90px">
        <el-form-item label="类型" prop="docType">
          <el-select v-model="docForm.docType" style="width:100%">
            <el-option v-for="t in ['MSDS','UN','DOT','FDA','ISO']" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="name"><el-input v-model="docForm.name" name="docName" autocomplete="off" /></el-form-item>
        <el-form-item label="版本" prop="version"><el-input v-model="docForm.version" name="docVersion" style="width:120px" autocomplete="off" /></el-form-item>
        <el-form-item label="有效期" prop="expireDate"><el-date-picker v-model="docForm.expireDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="docDialog = false">取消</el-button>
        <el-button type="primary" @click="createDoc">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加禁词 -->
    <el-dialog v-model="wordDialog" title="添加禁词" width="460px">
      <el-form label-width="90px">
        <el-form-item label="禁词"><el-input v-model="wordForm.word" /></el-form-item>
        <el-form-item label="建议替换"><el-input v-model="wordForm.replacement" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="wordDialog = false">取消</el-button>
        <el-button type="primary" @click="createWord">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api';

const checklist = ref<any[]>([]);
const docs = ref<any[]>([]);
const words = ref<any[]>([]);
const scanText = ref('');
const scanResult = ref<any>(null);
const docDialog = ref(false);
const wordDialog = ref(false);
const helpDialog = ref(false);
const helpActive = ref('MSDS');
const docForm = reactive<any>({ docType: 'MSDS', name: '', version: 'v1.0', expireDate: '' });
const wordForm = reactive<any>({ word: '', replacement: '' });

const docHelp = [
  {
    type: 'MSDS',
    title: '材料安全数据表（Material Safety Data Sheet）',
    what: '按 GHS 全球化学品统一分类体系编制的 16 项安全说明书：成分、理化特性、危险性、急救 / 消防 / 泄漏处理、储运与废弃要求。',
    usage: [
      '跨境平台（亚马逊 / 独立站 / B2B 平台）上架审核的必备材料',
      '空运、海运、陆运申报与目的国清关的基础文件',
      '海外客户（采购、质检、验厂）索取率最高的文件',
    ],
    how: [
      '优先向国内生产厂家 / 供应商索取（由配方工程师编制）',
      '厂家缺失时可委托第三方机构（SGS、TÜV、Intertek）按 GHS Rev.9 与 GB/T 16483 编制',
      '每个产品 SKU 单独一份，成分变更必须更新版本号',
    ],
  },
  {
    type: 'UN',
    title: '危险品运输编号与申报（UN Number / PSN）',
    what: '联合国危险货物编号（奶油气弹一般为 UN 1070，一氧化二氮，2.2 类）与正确运输名称（PSN）、包装类别。',
    usage: [
      '所有危险品出口必须申报 UN 编号，DHL / UPS / FedEx 等承运人据此确定可否承运及运费',
      '海运按 IMDG Code、空运按 IATA DGR 订舱的必填信息',
      '决定选用符合的 UN 包装（如 4G 瓦楞箱）与危险品标签',
    ],
    how: [
      '在 MSDS 第 14 项（运输信息）中核对 UN 编号与类别',
      '对照联合国《危险货物一览表》/ IATA DGR 确认分类与包装指引',
      '拿不准时咨询有危险品资质的货代或 DG 专家',
    ],
  },
  {
    type: 'DOT',
    title: '美国运输部法规（US DOT / 49 CFR）',
    what: '美国危险品运输法规（49 CFR Parts 100-185，PHMSA 执行）：包装标记、标签、运输文件与隔离要求。',
    usage: [
      '出口美国及美国境内运输的强制合规，违规将被重罚',
      '确定包装箱上的 UN 标记（如 4G/Y15/S/…）与 Class 2.2 标签',
      '空运需附危险品申报单（Shipper\u2019s Declaration for Dangerous Goods）',
    ],
    how: [
      '按 49 CFR 172 及包装厂商的 UN 测试报告确定标记与标签',
      '由货代 / 危险品顾问出具运输声明',
      '出货前核对包装 UN 测试报告在有效期内',
    ],
  },
  {
    type: 'FDA',
    title: '美国食品药品监督管理局（US FDA）',
    what: '食品接触材料（FCM）与食品进口合规：21 CFR 测试、FURLS 注册、Prior Notice 预先通报。',
    usage: [
      '奶油发泡产品与食品直接接触，需符合 FDA 食品接触材料要求',
      '出口美国的食品 / 食品接触品进口需由进口商提交 Prior Notice',
      '餐饮连锁、商超等买家审核时会查验 FDA 相关文件',
    ],
    how: [
      '食品接触合规由厂家 / 实验室按 21 CFR 做迁移测试并出具符合性声明',
      '进口商在 FDA 官网注册食品设施并在 ACS 系统提交 Prior Notice',
      '与买家确认清关责任方（FOB 条款下多为买方申报）',
    ],
  },
  {
    type: 'ISO',
    title: '体系认证（ISO 9001 / 22000 / 14001 等）',
    what: '企业质量管理 / 食品安全 / 环境管理体系认证证书，是海外客户供应商审核的硬性门槛。',
    usage: [
      '品牌商、商超等海外客户验厂与询盘转化的信任背书',
      '作为资质信号提升线索评分与报价竞争力',
    ],
    how: [
      '联系认证机构（SGS、TÜV、BSI、CQC 等）完成体系审核，周期约 1-3 个月',
      '关注证书有效期（一般 3 年）与年度监督审核，避免过期失效',
    ],
  },
];

const doneCount = computed(() => checklist.value.filter((c) => c.done).length);

const toggle = async (c: any) => {
  const prev = c.done;
  c.done = !c.done; // 乐观更新，失败则回滚
  try {
    checklist.value = await api.compliance.toggleCheck({ key: c.key });
  } catch {
    c.done = prev;
    ElMessage.error('保存失败，请重试');
  }
};

const removeDoc = async (row: any) => {
  await ElMessageBox.confirm(`删除文档「${row.name}」？`, '删除', { type: 'warning' });
  await api.compliance.removeDoc(row.id);
  loadDocs();
};

const createDoc = async () => {
  if (!docForm.name) return ElMessage.warning('名称必填');
  await api.compliance.addDoc(docForm);
  ElMessage.success('文档已添加');
  docDialog.value = false;
  loadDocs();
};

const removeWord = async (row: any) => {
  await ElMessageBox.confirm(`删除禁词「${row.word}」？`, '删除', { type: 'warning' });
  await api.compliance.removeForbiddenWord(row.id);
  loadWords();
};

const createWord = async () => {
  if (!wordForm.word) return ElMessage.warning('禁词必填');
  await api.compliance.addForbiddenWord(wordForm);
  ElMessage.success('禁词已添加');
  wordDialog.value = false;
  loadWords();
};

const doScan = async () => {
  if (!scanText.value) return ElMessage.warning('请输入文案');
  scanResult.value = await api.compliance.scan({ text: scanText.value });
};

const loadDocs = async () => { docs.value = await api.compliance.docs(); };
const loadWords = async () => { words.value = await api.compliance.forbiddenWords(); };

onMounted(async () => {
  checklist.value = await api.compliance.checklist();
  loadDocs();
  loadWords();
});
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.check-item { display: flex; gap: 8px; align-items: flex-start; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; }
.check-item.done { background: #f0f9eb; border-color: #b3e19d; }
.check-label { font-size: 13px; }
.word { color: #f56c6c; font-weight: 600; }
.doc-list { margin: 0; padding-left: 18px; line-height: 1.8; }
</style>
