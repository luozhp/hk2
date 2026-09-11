<template>
  <div v-loading="loading">
    <el-page-header @back="$router.back()" style="margin-bottom:16px">
      <template #content>
        <span style="font-weight:600">{{ data?.company?.name }}</span>
        <el-tag size="small" :type="gradeType(data?.company?.level)" style="margin-left:8px">{{ data?.company?.level }}</el-tag>
        <el-tag size="small" effect="plain" style="margin-left:8px">{{ custTypeLabel(data?.company?.custType) }}</el-tag>
      </template>
    </el-page-header>

    <el-row :gutter="16">
      <!-- 左列：客户卡片 + 商机 -->
      <el-col :span="9">
        <el-card shadow="never">
          <template #header>客户信息</template>
          <el-descriptions :column="1" size="small" border>
            <el-descriptions-item label="官网">
              <el-link :href="data?.company?.website" target="_blank" type="primary">{{ data?.company?.domain }}</el-link>
            </el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ data?.company?.email || '—' }}</el-descriptions-item>
            <el-descriptions-item label="电话">{{ data?.company?.phone || '—' }}</el-descriptions-item>
            <el-descriptions-item label="地址">{{ data?.company?.city ? data.company.city + ', ' + data.company.state : '—' }}</el-descriptions-item>
            <el-descriptions-item label="标签">
              <el-tag v-for="t in data?.company?.tags" :key="t" size="small" effect="plain" style="margin-right:4px">{{ t }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="描述">{{ data?.company?.description || '—' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card shadow="never" style="margin-top:16px">
          <template #header>
            <div class="card-header">
              <span>商机</span>
              <el-button size="small" type="primary" plain @click="showOpp">+ 新建商机</el-button>
            </div>
          </template>
          <el-empty v-if="!data?.opportunities?.length" description="暂无商机" :image-size="60" />
          <div v-else>
            <div v-for="o in data.opportunities" :key="o.id" class="opp-item">
              <div class="opp-row">
                <span class="opp-title">{{ o.title }}</span>
                <el-select :model-value="o.stage" size="small" style="width:90px" @change="(v: string) => changeStage(o, v)">
                  <el-option v-for="s in dict.oppStage" :key="s.value" :label="s.label" :value="s.value" />
                </el-select>
              </div>
              <div class="opp-meta">金额 ${{ o.amount.toLocaleString() }} · 预计 {{ o.expectedDate || '—' }} · {{ o.source }}</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右列：联系人 + 时间线 -->
      <el-col :span="15">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>决策人</span>
              <el-button size="small" type="primary" plain @click="showContact">+ 添加决策人</el-button>
            </div>
          </template>
          <el-table :data="data?.contacts || []" size="small">
            <el-table-column prop="name" label="姓名" min-width="110" />
            <el-table-column label="职位" min-width="150">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{ roleLabel(row.titleRole) }}</el-tag>
                <div style="font-size:12px;color:#909399">{{ row.title }}</div>
              </template>
            </el-table-column>
            <el-table-column label="LinkedIn" width="90">
              <template #default="{ row }">
                <el-link v-if="row.linkedin" :href="row.linkedin" target="_blank" type="primary">查看</el-link>
                <span v-else>—</span>
              </template>
            </el-table-column>
            <el-table-column label="触达状态" width="100">
              <template #default="{ row }">
                <el-tag size="small" :type="touchType(row.touchStatus)">{{ touchLabel(row.touchStatus) }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-card shadow="never" style="margin-top:16px">
          <template #header>
            <div class="card-header">
              <span>跟进时间线</span>
              <el-button size="small" type="primary" plain @click="showActivity">+ 记录跟进</el-button>
            </div>
          </template>
          <el-timeline v-if="data?.activities?.length">
            <el-timeline-item
              v-for="a in data.activities" :key="a.id"
              :type="actType(a.type)" :timestamp="formatTime(a.createdAt)">
              <div class="act-content">
                <el-tag size="small" effect="plain">{{ actLabel(a.type) }}</el-tag>
                <span>{{ a.content }}</span>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无跟进记录" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 新建商机 -->
    <el-dialog v-model="oppDialog" title="新建商机" width="500px">
      <el-form label-width="90px">
        <el-form-item label="标题"><el-input v-model="oppForm.title" /></el-form-item>
        <el-form-item label="金额(USD)"><el-input-number v-model="oppForm.amount" :min="0" :step="1000" style="width:100%" /></el-form-item>
        <el-form-item label="阶段">
          <el-select v-model="oppForm.stage" style="width:100%">
            <el-option v-for="s in dict.oppStage" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="预计成交"><el-date-picker v-model="oppForm.expectedDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="oppDialog = false">取消</el-button>
        <el-button type="primary" @click="createOpp">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加决策人 -->
    <el-dialog v-model="contactDialog" title="添加决策人" width="500px">
      <el-form label-width="90px">
        <el-form-item label="姓名"><el-input v-model="contactForm.name" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="contactForm.titleRole" style="width:100%">
            <el-option label="Purchasing Manager 采购经理" value="purchasing" />
            <el-option label="Import Manager 进口经理" value="import" />
            <el-option label="Category Manager 品类经理" value="category" />
            <el-option label="Owner / CEO 老板" value="owner" />
          </el-select>
        </el-form-item>
        <el-form-item label="LinkedIn"><el-input v-model="contactForm.linkedin" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="contactForm.email" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="contactDialog = false">取消</el-button>
        <el-button type="primary" @click="createContact">保存</el-button>
      </template>
    </el-dialog>

    <!-- 记录跟进 -->
    <el-dialog v-model="activityDialog" title="记录跟进" width="500px">
      <el-form label-width="90px">
        <el-form-item label="类型">
          <el-select v-model="activityForm.type" style="width:100%">
            <el-option label="邮件" value="email" />
            <el-option label="电话" value="call" />
            <el-option label="备注" value="note" />
            <el-option label="会议" value="meeting" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容"><el-input v-model="activityForm.content" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="activityDialog = false">取消</el-button>
        <el-button type="primary" @click="createActivity">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import api, { dict } from '../api';

const route = useRoute();
const id = route.params.id as string;
const loading = ref(false);
const data = ref<any>(null);

const oppDialog = ref(false);
const oppForm = reactive<any>({ title: '', amount: 10000, stage: 'inquiry', expectedDate: '' });
const contactDialog = ref(false);
const contactForm = reactive<any>({ name: '', titleRole: 'purchasing', linkedin: '', email: '' });
const activityDialog = ref(false);
const activityForm = reactive<any>({ type: 'note', content: '' });

const custTypeLabel = (v: string) => dict.custType.find((d) => d.value === v)?.label || v;
const gradeType = (g: string) => ({ A: 'success', B: 'warning', C: 'info' } as any)[g];
const roleLabel = (r: string) => ({ purchasing: '采购', import: '进口', category: '品类', owner: '老板' } as any)[r] || r;
const touchLabel = (t: string) => ({ untouched: '未触达', linkedin: '已加好友', replied: '已回复' } as any)[t] || t;
const touchType = (t: string) => ({ untouched: 'info', linkedin: 'warning', replied: 'success' } as any)[t] || 'info';
const actLabel = (t: string) => ({ email: '邮件', call: '电话', note: '备注', meeting: '会议' } as any)[t] || t;
const actType = (t: string) => ({ email: 'primary', call: 'warning', note: 'info', meeting: 'success' } as any)[t] || 'primary';

const formatTime = (d: string) => {
  const date = new Date(d);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const load = async () => {
  loading.value = true;
  data.value = await api.companies.detail(id);
  loading.value = false;
};

const showOpp = () => { Object.assign(oppForm, { title: '', amount: 10000, stage: 'inquiry', expectedDate: '' }); oppDialog.value = true; };
const createOpp = async () => {
  if (!oppForm.title) return ElMessage.warning('标题必填');
  await api.companies.addOpportunity({ companyId: id, ...oppForm });
  ElMessage.success('商机已创建');
  oppDialog.value = false;
  load();
};
const changeStage = async (o: any, stage: string) => {
  const prev = o.stage;
  o.stage = stage; // 乐观更新
  try {
    await api.companies.updateOpportunity(o.id, { stage });
    ElMessage.success('商机阶段已更新');
  } catch {
    o.stage = prev; // 接口失败回滚，避免 UI 与服务端分叉
    return;
  }
  load();
};

const showContact = () => { Object.assign(contactForm, { name: '', titleRole: 'purchasing', linkedin: '', email: '' }); contactDialog.value = true; };
const createContact = async () => {
  if (!contactForm.name) return ElMessage.warning('姓名必填');
  await api.companies.addContact({ companyId: id, ...contactForm });
  ElMessage.success('决策人已添加');
  contactDialog.value = false;
  load();
};

const showActivity = () => { Object.assign(activityForm, { type: 'note', content: '' }); activityDialog.value = true; };
const createActivity = async () => {
  if (!activityForm.content) return ElMessage.warning('内容必填');
  await api.companies.addActivity({ companyId: id, ...activityForm });
  ElMessage.success('跟进已记录');
  activityDialog.value = false;
  load();
};

onMounted(load);
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.opp-item { padding: 10px 0; border-bottom: 1px solid #f0f2f5; }
.opp-row { display: flex; justify-content: space-between; align-items: center; }
.opp-title { font-weight: 600; font-size: 13px; }
.opp-meta { font-size: 12px; color: #909399; margin-top: 4px; }
.act-content { display: flex; gap: 8px; align-items: center; font-size: 13px; }
</style>
