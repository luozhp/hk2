<template>
  <div>
    <!-- 筛选 -->
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="客户类型">
          <el-select v-model="filters.custType" placeholder="全部" clearable style="width:140px">
            <el-option v-for="d in dict.custType" :key="d.value" :label="d.label" :value="d.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源">
          <el-select v-model="filters.source" placeholder="全部" clearable style="width:140px">
            <el-option v-for="d in dict.source" :key="d.value" :label="d.label" :value="d.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="评分">
          <el-select v-model="filters.grade" placeholder="全部" clearable style="width:120px">
            <el-option v-for="d in dict.grade" :key="d.value" :label="d.label" :value="d.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="校验">
          <el-select v-model="filters.check" placeholder="全部" clearable style="width:120px">
            <el-option label="三项全通过" value="pass" />
            <el-option label="未全通过" value="fail" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="load">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card shadow="never" style="margin-top:16px">
      <template #header>
        <div class="card-header">
          <span>线索池 <el-tag size="small">{{ leads.length }} 条</el-tag></span>
          <div>
            <el-button size="small" type="success" plain :disabled="!selected.length" @click="batchConvert">批量转客户</el-button>
            <el-button size="small" @click="showAdd">+ 手动录入</el-button>
            <el-button size="small" @click="showImport">导入 Excel</el-button>
          </div>
        </div>
      </template>

      <el-table :data="leads" @selection-change="(v: any) => (selected = v)" size="default">
        <el-table-column type="selection" width="46" />
        <el-table-column label="公司" min-width="180">
          <template #default="{ row }">
            <div class="company-name">{{ row.companyName }}</div>
            <div class="company-domain">{{ row.domain }}</div>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="110">
          <template #default="{ row }">
            <el-tooltip :content="row.sourceNote" placement="top">
              <el-tag size="small" effect="plain">{{ sourceLabel(row.source) }}</el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="客户类型" width="110">
          <template #default="{ row }">{{ custTypeLabel(row.custType) }}</template>
        </el-table-column>
        <el-table-column label="评分" width="90">
          <template #default="{ row }">
            <el-tag :type="gradeType(row.grade)" size="small">{{ row.grade }} · {{ row.score }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="三标准校验" width="190">
          <template #default="{ row }">
            <el-space :size="4">
              <el-tag size="small" :type="row.check1 ? 'success' : 'danger'">在售{{ row.check1 ? '✓' : '✗' }}</el-tag>
              <el-tag size="small" :type="row.check2 ? 'success' : 'danger'">邮箱{{ row.check2 ? '✓' : '✗' }}</el-tag>
              <el-tag size="small" :type="row.check3 ? 'success' : 'danger'">地图{{ row.check3 ? '✓' : '✗' }}</el-tag>
            </el-space>
          </template>
        </el-table-column>
        <el-table-column label="负责人" width="90">
          <template #default="{ row }">{{ row.assignee ? '已分配' : '待分配' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 'converted' ? 'success' : 'info'">
              {{ row.status === 'converted' ? '已转客户' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status !== 'converted'" link type="primary" size="small" @click="convert(row)">转客户</el-button>
            <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 手动录入 -->
    <el-dialog v-model="addDialog" title="手动录入线索" width="520px">
      <el-form label-width="90px">
        <el-form-item label="公司名"><el-input v-model="form.companyName" /></el-form-item>
        <el-form-item label="域名"><el-input v-model="form.domain" placeholder="example.com" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item>
        <el-form-item label="客户类型">
          <el-select v-model="form.custType" style="width:100%">
            <el-option v-for="d in dict.custType" :key="d.value" :label="d.label" :value="d.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="评分">
          <el-input-number v-model="form.score" :min="0" :max="100" style="width:120px" />
          <span style="font-size:12px;color:#909399;margin-left:8px">≥80=A / ≥60=B / 其余=C</span>
        </el-form-item>
        <el-form-item label="三标准校验">
          <el-checkbox v-model="form.check1">在售同类产品</el-checkbox>
          <el-checkbox v-model="form.check2">真实邮箱</el-checkbox>
          <el-checkbox v-model="form.check3">地图可定位</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialog = false">取消</el-button>
        <el-button type="primary" @click="createLead">保存</el-button>
      </template>
    </el-dialog>

    <!-- 导入 -->
    <el-dialog v-model="importDialog" title="批量导入线索（Excel/CSV）" width="600px">
      <el-alert title="字段映射：companyName / domain / email / custType / score（可留空）。原型阶段粘贴表格数据即可。" type="info" :closable="false" style="margin-bottom:12px" />
      <el-input v-model="importText" type="textarea" :rows="8" placeholder="BakerySupply,bakerysupply.net,import@bakerysupply.net,importer,93&#10;CoffeeUS,coffeeus.com,sales@coffeeus.com,foodservice,80" />
      <template #footer>
        <el-button @click="importDialog = false">取消</el-button>
        <el-button type="primary" @click="doImport">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api, { dict } from '../api';

const leads = ref<any[]>([]);
const selected = ref<any[]>([]);
const filters = reactive<any>({ custType: '', source: '', grade: '', check: '' });
const addDialog = ref(false);
const importDialog = ref(false);
const form = reactive<any>({ companyName: '', domain: '', email: '', custType: 'importer', score: 60, check1: false, check2: false, check3: false });
const importText = ref('');

const sourceLabel = (s: string) => dict.source.find((d) => d.value === s)?.label || s;
const custTypeLabel = (v: string) => dict.custType.find((d) => d.value === v)?.label || v;
const gradeType = (g: string) => ({ A: 'success', B: 'warning', C: 'info' } as any)[g];

const load = async () => {
  const params: any = {};
  if (filters.custType) params.custType = filters.custType;
  if (filters.source) params.source = filters.source;
  if (filters.grade) params.grade = filters.grade;
  if (filters.check) params.check = filters.check;
  leads.value = await api.leads.list(params);
};

const reset = () => {
  Object.assign(filters, { custType: '', source: '', grade: '', check: '' });
  load();
};

const passedAll = (r: any) => r.check1 && r.check2 && r.check3;

const convert = async (row: any) => {
  const passed = passedAll(row);
  await ElMessageBox.confirm(
    passed ? `将「${row.companyName}」转为客户档案？` : `「${row.companyName}」未通过三项校验（在售/邮箱/地图），确认仍要转客户？`,
    '转客户',
    { type: passed ? 'info' : 'warning' }
  );
  const res = await api.leads.convert(row.id, { assignee: 'u1' });
  ElMessage.success(`已创建客户档案：${res.company.name}`);
  load();
};

const batchConvert = async () => {
  const failed = selected.value.filter((r) => r.status !== 'converted' && !passedAll(r)).length;
  const tip = failed
    ? `批量转换 ${selected.value.length} 条线索为客户？其中 ${failed} 条未通过三项校验，仍继续？`
    : `批量转换 ${selected.value.length} 条线索为客户？`;
  await ElMessageBox.confirm(tip, '批量转客户', { type: failed ? 'warning' : 'info' });
  for (const r of selected.value) {
    if (r.status !== 'converted') await api.leads.convert(r.id, { assignee: 'u1' });
  }
  ElMessage.success('批量转换完成');
  load();
};

const remove = async (row: any) => {
  await ElMessageBox.confirm(`删除线索「${row.companyName}」？`, '删除', { type: 'warning' });
  await api.leads.remove(row.id);
  ElMessage.success('已删除');
  load();
};

const showAdd = () => { Object.assign(form, { companyName: '', domain: '', email: '', custType: 'importer', score: 60, check1: false, check2: false, check3: false }); addDialog.value = true; };
const createLead = async () => {
  if (!form.companyName || !form.domain) return ElMessage.warning('公司名与域名必填');
  await api.leads.create(form);
  ElMessage.success('已录入');
  addDialog.value = false;
  load();
};

const showImport = () => { importText.value = ''; importDialog.value = true; };
const doImport = async () => {
  const items = importText.value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [companyName, domain, email, custType, score] = l.split(',');
      return { companyName, domain, email, custType: custType || 'importer', score: score ? Number(score) : 60, source: 'import' };
    });
  if (!items.length) return ElMessage.warning('请粘贴数据');
  const res = await api.leads.import({ items });
  ElMessage.success(`成功导入 ${res.imported} 条`);
  importDialog.value = false;
  load();
};

onMounted(load);
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.company-name { font-weight: 600; font-size: 14px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.company-domain { font-size: 12px; color: #909399; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
