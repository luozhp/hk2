<template>
  <div>
    <el-row :gutter="16">
      <!-- B端关键词 -->
      <el-col :span="14">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>B 端采购意图关键词</span>
              <el-button size="small" type="primary" plain @click="kwDialog = true">+ 添加关键词</el-button>
            </div>
          </template>
          <el-alert
            title="重点布局 B 端采购意图词（wholesale / supplier / manufacturer / bulk / OEM / private label），对应独立站落地页"
            type="info" :closable="false" show-icon style="margin-bottom:12px" />
          <el-table :data="keywords" size="small">
            <el-table-column prop="keyword" label="关键词" min-width="240" />
            <el-table-column label="类型" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="row.category === 'head' ? 'success' : 'info'">{{ row.category === 'head' ? '核心词' : '长尾词' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="landingPage" label="落地页" width="110" />
            <el-table-column label="排名" width="80">
              <template #default="{ row }">{{ row.rank ? '#' + row.rank : '待跟踪' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="row.status === 'tracking' ? 'success' : 'warning'">{{ row.status === 'tracking' ? '跟踪中' : '待收录' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="70">
              <template #default="{ row }">
                <el-button link type="danger" size="small" @click="removeKw(row)">删除</el-button>
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
          <el-alert
            title="必加：whip charger、whip gas 等，过滤吸食相关垃圾流量，保护账号质量分"
            type="warning" :closable="false" show-icon style="margin-bottom:12px" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api';

const keywords = ref<any[]>([]);
const negativeKeywords = ref<any[]>([]);
const adCampaigns = ref<any[]>([]);
const kwDialog = ref(false);
const nkDialog = ref(false);
const kwForm = reactive<any>({ keyword: '', category: 'longtail', landingPage: '/wholesale' });
const nkForm = reactive<any>({ keyword: '', channel: 'google-ads', note: '' });

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
  adCampaigns.value = [
    { id: 'AD001', name: 'US 批发关键词（测试）', budgetDaily: 40, spent: 320, clicks: 18, ctr: 0.145, conversions: 1, status: 'paused' },
  ];
};

onMounted(load);
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.neg { color: #e6a23c; font-weight: 600; }
.ad-item { padding: 10px 0; border-bottom: 1px solid #f0f2f5; }
.ad-row { display: flex; justify-content: space-between; align-items: center; }
.ad-name { font-weight: 600; font-size: 13px; }
.ad-meta { font-size: 12px; color: #909399; margin-top: 4px; }
</style>
