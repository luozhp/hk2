<template>
  <div class="login-page">
    <div class="bg-glow bg-glow-1"></div>
    <div class="bg-glow bg-glow-2"></div>

    <div class="login-card">
      <div class="brand">
        <div class="brand-icon">
          <el-icon :size="26"><Compass /></el-icon>
        </div>
        <div>
          <div class="brand-title">Hunter</div>
          <div class="brand-sub">B2B 寻客系统 · 正式版</div>
        </div>
      </div>

      <div class="form-title">欢迎登录</div>
      <div class="form-sub">使用你的工作账号继续使用 Hunter</div>

      <el-form :model="form" size="large" @submit.prevent>
        <el-form-item label="邮箱" label-position="top" class="login-field">
          <el-input
            v-model="form.email"
            placeholder="邮箱账号"
            :prefix-icon="Message"
            name="email"
            autocomplete="email"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-form-item label="密码" label-position="top" class="login-field">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            show-password
            :prefix-icon="Lock"
            name="password"
            autocomplete="current-password"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-form-item style="margin-bottom: 8px">
          <el-button
            type="primary"
            class="submit-btn"
            :loading="loading"
            @click="submit"
          >
            登 录
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 演示账号仅在开发环境展示，避免生产环境泄露初始密码 -->
      <div class="demo-tip" v-if="isDev">
        <el-icon><InfoFilled /></el-icon>
        <span>演示账号：sales@smileiceqi.com / Hunter@123（管理员：boss@smileiceqi.com）</span>
      </div>

      <div class="footer">© 2026 Smile Ice Qi · Hunter v1.0.0</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Message, Lock, InfoFilled } from '@element-plus/icons-vue';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();
const loading = ref(false);
const form = reactive({ email: '', password: '' });
// 生产环境不展示演示账号（避免泄露初始密码）
const isDev = import.meta.env.DEV;

async function submit() {
  if (!form.email || !form.password) {
    ElMessage.warning('请输入邮箱与密码');
    return;
  }
  loading.value = true;
  try {
    await auth.login(form.email.trim(), form.password);
    ElMessage.success('登录成功');
    router.push('/dashboard');
  } catch (e: any) {
    const msg = e?.response?.data?.message;
    ElMessage.error(msg || '登录失败，请检查邮箱与密码');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  position: relative;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #0f172a 100%);
}

.bg-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.35;
}
.bg-glow-1 {
  width: 480px;
  height: 480px;
  top: -120px;
  left: -100px;
  background: #409eff;
}
.bg-glow-2 {
  width: 420px;
  height: 420px;
  bottom: -140px;
  right: -80px;
  background: #00c6ff;
}

.login-card {
  position: relative;
  z-index: 1;
  width: 400px;
  padding: 40px 36px 28px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
}
.brand-icon {
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(135deg, #409eff, #00c6ff);
}
.brand-title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}
.brand-sub {
  font-size: 12px;
  color: #64748b;
}

.form-title {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}
.form-sub {
  font-size: 13px;
  color: #94a3b8;
  margin: 6px 0 24px;
}

.login-field :deep(.el-form-item__label) {
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  line-height: 1.5;
}

.submit-btn {
  width: 100%;
  font-weight: 600;
  letter-spacing: 4px;
}

.demo-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12px;
  color: #0369a1;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
}

.footer {
  margin-top: 20px;
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
}
</style>
