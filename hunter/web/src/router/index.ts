import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '../layouts/MainLayout.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      redirect: '/dashboard',
      children: [
        { path: 'dashboard', name: 'dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '工作台' } },
        { path: 'discover', name: 'discover', component: () => import('../views/Discover.vue'), meta: { title: '线索采集' } },
        { path: 'leads', name: 'leads', component: () => import('../views/Leads.vue'), meta: { title: '线索池' } },
        { path: 'customers', name: 'customers', component: () => import('../views/Customers.vue'), meta: { title: '客户管理' } },
        { path: 'customers/:id', name: 'customer-detail', component: () => import('../views/CustomerDetail.vue'), meta: { title: '客户详情' } },
        { path: 'mail', name: 'mail', component: () => import('../views/MailCenter.vue'), meta: { title: '邮件中心' } },
        { path: 'compliance', name: 'compliance', component: () => import('../views/Compliance.vue'), meta: { title: '合规管理' } },
        { path: 'keywords', name: 'keywords', component: () => import('../views/Keywords.vue'), meta: { title: '关键词库' } },
        { path: 'analytics', name: 'analytics', component: () => import('../views/Analytics.vue'), meta: { title: '数据看板' } },
        { path: 'settings', name: 'settings', component: () => import('../views/Settings.vue'), meta: { title: '系统设置' } },
      ],
    },
  ],
});

export default router;
