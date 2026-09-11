import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '../layouts/MainLayout.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: { title: '登录', public: true },
    },
    {
      path: '/',
      component: MainLayout,
      redirect: '/dashboard',
      children: [
        { path: 'dashboard', name: 'dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '工作台' } },
        { path: 'discover', name: 'discover', component: () => import('../views/Discover.vue'), meta: { title: '线索采集' } },
        { path: 'leads', name: 'leads', component: () => import('../views/Leads.vue'), meta: { title: '线索池' } },
        { path: 'inquiries', name: 'inquiries', component: () => import('../views/Inquiries.vue'), meta: { title: '询盘管理' } },
        { path: 'customers', name: 'customers', component: () => import('../views/Customers.vue'), meta: { title: '客户管理' } },
        { path: 'customers/:id', name: 'customer-detail', component: () => import('../views/CustomerDetail.vue'), meta: { title: '客户详情' } },
        { path: 'maintenance', name: 'maintenance', component: () => import('../views/Maintenance.vue'), meta: { title: '客户维护' } },
        { path: 'mail', name: 'mail', component: () => import('../views/MailCenter.vue'), meta: { title: '邮件中心' } },
        { path: 'compliance', name: 'compliance', component: () => import('../views/Compliance.vue'), meta: { title: '合规管理' } },
        { path: 'keywords', name: 'keywords', component: () => import('../views/Keywords.vue'), meta: { title: '关键词库' } },
        { path: 'channels', name: 'channels', component: () => import('../views/Channels.vue'), meta: { title: '获客渠道' } },
        { path: 'customs', name: 'customs', component: () => import('../views/CustomsData.vue'), meta: { title: '海关数据' } },
        { path: 'directory', name: 'directory', component: () => import('../views/Directory.vue'), meta: { title: '行业平台' } },
        { path: 'expos', name: 'expos', component: () => import('../views/Expos.vue'), meta: { title: '国际专业展会' } },
        { path: 'analytics', name: 'analytics', component: () => import('../views/Analytics.vue'), meta: { title: '数据看板' } },
        { path: 'settings', name: 'settings', component: () => import('../views/Settings.vue'), meta: { title: '系统设置' } },
        { path: ':pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFound.vue'), meta: { title: '页面不存在' } },
      ],
    },
  ],
});

// 全局守卫：未登录跳转登录页
router.beforeEach((to) => {
  const token = localStorage.getItem('hunter_token');
  const isPublic = to.meta.public;
  if (!token && !isPublic) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
  if (token && to.path === '/login') {
    return { path: '/dashboard' };
  }
  return true;
});

export default router;
