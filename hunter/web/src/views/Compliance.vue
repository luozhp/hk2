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
              <el-button size="small" type="primary" plain @click="docDialog = true">+ 上传文档</el-button>
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

    <!-- 上传文档 -->
    <el-dialog v-model="docDialog" title="上传合规文档" width="520px">
      <el-form label-width="90px">
        <el-form-item label="类型">
          <el-select v-model="docForm.docType" style="width:100%">
            <el-option v-for="t in ['MSDS','UN','DOT','FDA','ISO']" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称"><el-input v-model="docForm.name" /></el-form-item>
        <el-form-item label="版本"><el-input v-model="docForm.version" style="width:120px" /></el-form-item>
        <el-form-item label="有效期"><el-date-picker v-model="docForm.expireDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
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
const docForm = reactive<any>({ docType: 'MSDS', name: '', version: 'v1.0', expireDate: '' });
const wordForm = reactive<any>({ word: '', replacement: '' });

const doneCount = computed(() => checklist.value.filter((c) => c.done).length);

const toggle = async (c: any) => {
  checklist.value = await api.compliance.toggleCheck({ key: c.key });
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
</style>
