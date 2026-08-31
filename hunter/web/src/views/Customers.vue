<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="客户类型">
          <el-select v-model="filters.custType" placeholder="全部" clearable style="width:140px">
            <el-option v-for="d in dict.custType" :key="d.value" :label="d.label" :value="d.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="等级">
          <el-select v-model="filters.level" placeholder="全部" clearable style="width:120px">
            <el-option v-for="d in dict.grade" :key="d.value" :label="d.label" :value="d.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="filters.owner" placeholder="全部" clearable style="width:120px">
            <el-option label="已分配" value="assigned" />
            <el-option label="未分配" value="unassigned" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="公司名/域名" clearable style="width:180px" @keyup.enter="load" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="load">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:16px">
      <template #header>
        <div class="card-header">
          <span>客户档案 <el-tag size="small">{{ companies.length }} 家</el-tag></span>
          <el-button size="small" type="primary" @click="showAdd">+ 新建客户</el-button>
        </div>
      </template>

      <el-table :data="companies" @row-click="(row: any) => $router.push('/customers/' + row.id)" style="cursor:pointer">
        <el-table-column label="公司" min-width="220">
          <template #default="{ row }">
            <div class="company-name">{{ row.name }}</div>
            <div class="company-domain">
              <el-link :href="row.website" target="_blank" type="primary">{{ row.domain }}</el-link>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="客户类型" width="110">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ custTypeLabel(row.custType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="等级" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="gradeType(row.level)">{{ row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="state" label="地区" width="90" />
        <el-table-column label="标签" min-width="180">
          <template #default="{ row }">
            <el-tag v-for="t in row.tags" :key="t" size="small" effect="plain" type="info" style="margin-right:4px">{{ t }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="联系人" width="90">
          <template #default="{ row }">{{ row.contactCount || 0 }} 人</template>
        </el-table-column>
        <el-table-column label="商机" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.oppCount ? 'success' : 'info'">{{ row.oppCount || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="负责人" width="90">
          <template #default="{ row }">{{ row.owner ? '已分配' : '—' }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="addDialog" title="新建客户" width="560px">
      <el-form label-width="90px">
        <el-form-item label="公司名"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="域名"><el-input v-model="form.domain" placeholder="example.com" /></el-form-item>
        <el-form-item label="客户类型">
          <el-select v-model="form.custType" style="width:100%">
            <el-option v-for="d in dict.custType" :key="d.value" :label="d.label" :value="d.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item>
        <el-form-item label="州"><el-input v-model="form.state" placeholder="CA / NY / TX" style="width:120px" /></el-form-item>
        <el-form-item label="标签">
          <el-select v-model="form.tags" multiple filterable allow-create default-first-option style="width:100%">
            <el-option v-for="t in tagOptions" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialog = false">取消</el-button>
        <el-button type="primary" @click="createCompany">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api, { dict } from '../api';

const companies = ref<any[]>([]);
const filters = reactive<any>({ custType: '', level: '', owner: '', keyword: '' });
const addDialog = ref(false);
const form = reactive<any>({ name: '', domain: '', custType: 'importer', email: '', state: '', tags: [], description: '' });
const tagOptions = ref<string[]>([]);

const custTypeLabel = (v: string) => dict.custType.find((d) => d.value === v)?.label || v;
const gradeType = (g: string) => ({ A: 'success', B: 'warning', C: 'info' } as any)[g];

const load = async () => {
  const params: any = {};
  if (filters.custType) params.custType = filters.custType;
  if (filters.level) params.level = filters.level;
  if (filters.owner === 'assigned') params.owner = 'u1';
  if (filters.keyword) params.keyword = filters.keyword;
  companies.value = await api.companies.list(params);
};

const reset = () => { Object.assign(filters, { custType: '', level: '', owner: '', keyword: '' }); load(); };

const showAdd = () => { Object.assign(form, { name: '', domain: '', custType: 'importer', email: '', state: '', tags: [], description: '' }); addDialog.value = true; };

const createCompany = async () => {
  if (!form.name) return ElMessage.warning('公司名必填');
  await api.companies.create(form);
  ElMessage.success('已创建客户');
  addDialog.value = false;
  load();
};

onMounted(async () => { tagOptions.value = await api.companies.tags(); load(); });
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.company-name { font-weight: 600; }
.company-domain { font-size: 12px; }
</style>
