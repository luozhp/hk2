<template>
  <div>
    <el-row :gutter="16">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>集成配置</template>
          <el-form label-width="130px">
            <el-form-item label="独立站">
              <el-input model-value="https://smileiceqi.com" disabled />
            </el-form-item>
            <el-form-item label="Google Search API">
              <el-input model-value="已配置（Custom Search JSON API）" disabled />
            </el-form-item>
            <el-form-item label="Google Maps API">
              <el-input model-value="已配置" disabled />
            </el-form-item>
            <el-form-item label="邮件发送（SES）">
              <el-input model-value="未连接（原型为模拟发送）" disabled />
            </el-form-item>
            <el-form-item label="收件箱（IMAP）">
              <el-input model-value="未连接（V1.1 接入）" disabled />
            </el-form-item>
            <el-form-item label="LinkedIn">
              <el-input model-value="未连接（V1.2 接入）" disabled />
            </el-form-item>
            <el-form-item label="海关数据">
              <el-input model-value="Excel 导入模式（V1.2 API 对接）" disabled />
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="never" style="margin-top:16px">
          <template #header>邮箱发送策略（防垃圾信）</template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="单账号日上限">50 封</el-descriptions-item>
            <el-descriptions-item label="发送间隔">60-120 秒随机</el-descriptions-item>
            <el-descriptions-item label="个性化要求">每封自动替换公司名/联系人名</el-descriptions-item>
            <el-descriptions-item label="域名认证">SPF / DKIM / DMARC（正式接入前配置）</el-descriptions-item>
            <el-descriptions-item label="退订合规">CAN-SPAM：自动退订 + 真实发件信息</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="never">
          <template #header>团队与权限</template>
          <el-table :data="users" size="small">
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column prop="email" label="邮箱" min-width="180" />
            <el-table-column label="角色" width="100">
              <template #default="{ row }">
                <el-tag size="small" :type="roleType(row.role)">{{ roleLabel(row.role) }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-alert
            title="权限矩阵：管理者（全部+删除+系统设置）；运营专员（线索/邮件/合规/广告/看板）；业务员（本人范围客户与发送）"
            type="info" :closable="false" show-icon style="margin-top:12px" />
        </el-card>

        <el-card shadow="never" style="margin-top:16px">
          <template #header>关于系统</template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="版本">Hunter v1.0（MVP 原型）</el-descriptions-item>
            <el-descriptions-item label="技术栈">Vue 3 + Element Plus / NestJS（JSON 持久化）</el-descriptions-item>
            <el-descriptions-item label="数据存储">server/data/db.json（重启保留）</el-descriptions-item>
            <el-descriptions-item label="关联文档">
              《B2B寻客系统产品功能文档》《架构选型与原型设计文档》《美国B2B客户开发产品文档》
            </el-descriptions-item>
          </el-descriptions>
          <el-button type="danger" plain size="small" style="margin-top:16px" @click="resetData">重置演示数据</el-button>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import axios from 'axios';

const users = ref([
  { name: '张伟', email: 'sales@smileiceqi.com', role: 'sales' },
  { name: '李娜', email: 'ops@smileiceqi.com', role: 'operator' },
  { name: '王总', email: 'boss@smileiceqi.com', role: 'admin' },
]);

const roleLabel = (r: string) => ({ sales: '业务员', operator: '运营专员', admin: '管理者' } as any)[r];
const roleType = (r: string) => ({ sales: 'info', operator: 'warning', admin: 'danger' } as any)[r];

const resetData = async () => {
  await ElMessageBox.confirm('重置将恢复演示种子数据，确定继续？', '重置数据', { type: 'warning' });
  await axios.post('/api/reset');
  ElMessage.success('数据已重置（刷新页面生效）');
};
</script>
