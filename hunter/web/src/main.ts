import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import * as Icons from '@element-plus/icons-vue';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(ElementPlus, { locale: zhCn });
for (const [name, comp] of Object.entries(Icons)) {
  app.component(name, comp);
}
// 全局兜底：Element 的 ElMessageBox.confirm 在用户点「取消」时会 reject('cancel')，
// 各页面调用处未逐个 catch 会产生 UnhandledPromiseRejection，这里统一静默处理
window.addEventListener('unhandledrejection', (event) => {
  const reason: any = (event as any).reason;
  if (reason === 'cancel' || reason === 'close' || reason?.message === 'cancel') {
    event.preventDefault();
  }
});

app.mount('#app');
