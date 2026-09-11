import axios from 'axios';
import { ElMessage } from 'element-plus';

const http = axios.create({ baseURL: '/api', timeout: 20000 });

// 请求拦截：自动携带 JWT
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('hunter_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：401 统一处理（登录接口自身失败除外）
http.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error?.response?.status;
    const isLoginCall = String(error?.config?.url || '').includes('/auth/login');
    if (status === 401 && !isLoginCall) {
      localStorage.removeItem('hunter_token');
      localStorage.removeItem('hunter_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    const msg = error?.response?.data?.message;
    if (Array.isArray(msg)) {
      ElMessage.error(msg.join('；'));
    } else if (typeof msg === 'string' && !isLoginCall) {
      // 5xx 不直出后端原文（可能含堆栈/内部细节）
      ElMessage.error(status && status >= 500 ? '服务器异常，请稍后重试' : msg);
    } else if (!isLoginCall) {
      // 无响应（断网 / 超时）时给出兜底提示，避免完全静默
      const timedOut = error?.code === 'ECONNABORTED' || /timeout/i.test(String(error?.message || ''));
      ElMessage.error(timedOut ? '请求超时，请检查网络后重试' : '网络异常，请检查连接后重试');
    }
    return Promise.reject(error);
  },
);

export const api = {
  auth: {
    login: (email: string, password: string) =>
      http.post('/auth/login', { email, password }).then((r) => r.data),
    me: () => http.get('/auth/me').then((r) => r.data),
    changePassword: (oldPassword: string, newPassword: string) =>
      http.post('/auth/change-password', { oldPassword, newPassword }).then((r) => r.data),
    users: () => http.get('/auth/users').then((r) => r.data),
    createUser: (data: any) => http.post('/auth/users', data).then((r) => r.data),
    resetPassword: (id: string) =>
      http.post(`/auth/users/${id}/reset-password`).then((r) => r.data),
    toggleStatus: (id: string, status: string) =>
      http.post(`/auth/users/${id}/status`, { status }).then((r) => r.data),
  },
  // 整库重置（后端已限制为管理员），走统一实例以携带 token
  reset: () => http.post('/reset').then((r) => r.data),

  dashboard: {
    overview: () => http.get('/dashboard/overview').then((r) => r.data),
  },
  discover: {
    presets: () => http.get('/discover/presets').then((r) => r.data),
    execute: (params: any) => http.get('/discover/execute', { params }).then((r) => r.data),
    provider: () => http.get('/discover/provider').then((r) => r.data),
  },
  leads: {
    list: (params: any = {}) => http.get('/leads', { params }).then((r) => r.data),
    create: (data: any) => http.post('/leads', data).then((r) => r.data),
    import: (data: any) => http.post('/leads/import', data).then((r) => r.data),
    convert: (id: string, data: any = {}) => http.post(`/leads/${id}/convert`, data).then((r) => r.data),
    remove: (id: string) => http.delete(`/leads/${id}`).then((r) => r.data),
  },
  companies: {
    list: (params: any = {}) => http.get('/companies', { params }).then((r) => r.data),
    tags: () => http.get('/companies/tags').then((r) => r.data),
    detail: (id: string) => http.get(`/companies/${id}`).then((r) => r.data),
    create: (data: any) => http.post('/companies', data).then((r) => r.data),
    update: (id: string, data: any) => http.put(`/companies/${id}`, data).then((r) => r.data),
    addContact: (data: any) => http.post('/companies/contacts', data).then((r) => r.data),
    updateContact: (id: string, data: any) => http.put(`/companies/contacts/${id}`, data).then((r) => r.data),
    addActivity: (data: any) => http.post('/companies/activities', data).then((r) => r.data),
    addOpportunity: (data: any) => http.post('/companies/opportunities', data).then((r) => r.data),
    updateOpportunity: (id: string, data: any) => http.put(`/companies/opportunities/${id}`, data).then((r) => r.data),
  },
  mail: {
    templates: () => http.get('/mail/templates').then((r) => r.data),
    records: (params: any = {}) => http.get('/mail/records', { params }).then((r) => r.data),
    stats: () => http.get('/mail/stats').then((r) => r.data),
    preview: (data: any) => http.post('/mail/preview', data).then((r) => r.data),
    check: (data: any) => http.post('/mail/check', data).then((r) => r.data),
    send: (data: any) => http.post('/mail/send', data).then((r) => r.data),
    provider: () => http.get('/mail/provider').then((r) => r.data),
    webhook: (data: any) => http.post('/mail/webhook', data).then((r) => r.data),
    replies: (params: any = {}) => http.get('/mail/replies', { params }).then((r) => r.data),
    unreadCount: () => http.get('/mail/replies/unread-count').then((r) => r.data),
    syncInbox: () => http.post('/mail/sync-inbox').then((r) => r.data),
    markReplyRead: (id: string) => http.post(`/mail/replies/${id}/read`).then((r) => r.data),
  },
  compliance: {
    docs: () => http.get('/compliance/docs').then((r) => r.data),
    addDoc: (data: any) => http.post('/compliance/docs', data).then((r) => r.data),
    updateDoc: (id: string, data: any) => http.put(`/compliance/docs/${id}`, data).then((r) => r.data),
    removeDoc: (id: string) => http.delete(`/compliance/docs/${id}`).then((r) => r.data),
    forbiddenWords: () => http.get('/compliance/forbidden-words').then((r) => r.data),
    addForbiddenWord: (data: any) => http.post('/compliance/forbidden-words', data).then((r) => r.data),
    removeForbiddenWord: (id: string) => http.delete(`/compliance/forbidden-words/${id}`).then((r) => r.data),
    scan: (data: any) => http.post('/compliance/scan', data).then((r) => r.data),
    checklist: () => http.get('/compliance/checklist').then((r) => r.data),
    toggleCheck: (data: any) => http.post('/compliance/checklist', data).then((r) => r.data),
  },
  keywords: {
    list: () => http.get('/keywords').then((r) => r.data),
    add: (data: any) => http.post('/keywords', data).then((r) => r.data),
    update: (id: string, data: any) => http.patch(`/keywords/${id}`, data).then((r) => r.data),
    remove: (id: string) => http.delete(`/keywords/${id}`).then((r) => r.data),
    negative: () => http.get('/keywords/negative').then((r) => r.data),
    addNegative: (data: any) => http.post('/keywords/negative', data).then((r) => r.data),
    removeNegative: (id: string) => http.delete(`/keywords/negative/${id}`).then((r) => r.data),
  },
  landing: {
    list: () => http.get('/landing-pages').then((r) => r.data),
    add: (data: any) => http.post('/landing-pages', data).then((r) => r.data),
    update: (id: string, data: any) => http.put(`/landing-pages/${id}`, data).then((r) => r.data),
    remove: (id: string) => http.delete(`/landing-pages/${id}`).then((r) => r.data),
  },
  inquiries: {
    list: (params: any = {}) => http.get('/inquiries', { params }).then((r) => r.data),
    stats: () => http.get('/inquiries/stats').then((r) => r.data),
    create: (data: any) => http.post('/inquiries', data).then((r) => r.data),
    update: (id: string, data: any) => http.put(`/inquiries/${id}`, data).then((r) => r.data),
    remove: (id: string) => http.delete(`/inquiries/${id}`).then((r) => r.data),
  },
  settings: {
    get: () => http.get('/settings').then((r) => r.data),
    update: (data: any) => http.put('/settings', data).then((r) => r.data),
  },
  analytics: {
    funnel: () => http.get('/analytics/funnel').then((r) => r.data),
    channels: () => http.get('/analytics/channels').then((r) => r.data),
    kpi: () => http.get('/analytics/kpi').then((r) => r.data),
  },
  customs: {
    sources: () => http.get('/customs/sources').then((r) => r.data),
    records: () => http.get('/customs/records').then((r) => r.data),
    import: (data: any) => http.post('/customs/import', data).then((r) => r.data),
    remove: (id: string) => http.delete(`/customs/records/${id}`).then((r) => r.data),
    query: (params: any) => http.get('/customs/query', { params }).then((r) => r.data),
  },
  directory: {
    sources: () => http.get('/directory/sources').then((r) => r.data),
    search: (params: any) => http.get('/directory/search', { params }).then((r) => r.data),
    searchAll: (params: any) => http.get('/directory/search-all', { params }).then((r) => r.data),
    import: (data: any) => http.post('/directory/import', data).then((r) => r.data),
    order: () => http.get('/directory/order').then((r) => r.data),
    saveOrder: (data: any) => http.post('/directory/order', data).then((r) => r.data),
  },
  expo: {
    fairs: () => http.get('/expo/fairs').then((r) => r.data),
    provider: () => http.get('/expo/provider').then((r) => r.data),
    providers: () => http.get('/expo/providers').then((r) => r.data),
    hints: (params: any) => http.get('/expo/hints', { params }).then((r) => r.data),
    saveHints: (data: any) => http.post('/expo/hints', data).then((r) => r.data),
    createFair: (data: any) => http.post('/expo/fairs', data).then((r) => r.data),
    updateFair: (id: string, data: any) => http.put(`/expo/fairs/${id}`, data).then((r) => r.data),
    deleteFair: (id: string) => http.delete(`/expo/fairs/${id}`).then((r) => r.data),
    discover: (params: any) => http.get('/expo/discover', { params }).then((r) => r.data),
    exhibitors: (params: any) => http.get('/expo/exhibitors', { params }).then((r) => r.data),
    import: (data: any) => http.post('/expo/import', data).then((r) => r.data),
  },
  maintenance: {
    overview: () => http.get('/maintenance/overview').then((r) => r.data),
    profiles: (params: any = {}) => http.get('/maintenance/profiles', { params }).then((r) => r.data),
    detail: (companyId: string) => http.get(`/maintenance/${companyId}`).then((r) => r.data),
    save: (companyId: string, data: any) => http.put(`/maintenance/${companyId}`, data).then((r) => r.data),
    addLog: (data: any) => http.post('/maintenance/logs', data).then((r) => r.data),
    removeLog: (id: string) => http.delete(`/maintenance/logs/${id}`).then((r) => r.data),
  },
};

export const dict = {
  custType: [
    { label: '餐饮分销商', value: 'foodservice' },
    { label: '进口批发商', value: 'importer' },
    { label: '贴牌品牌', value: 'privateLabel' },
    { label: '电商批发商', value: 'ecommerce' },
  ],
  grade: [
    { label: 'A 级', value: 'A', type: 'success' },
    { label: 'B 级', value: 'B', type: 'warning' },
    { label: 'C 级', value: 'C', type: 'info' },
  ],
  source: [
    { label: 'Google 搜索', value: 'google' },
    { label: '海关数据', value: 'customs' },
    { label: '行业平台', value: 'directory' },
    { label: '企业黄页', value: 'yellowpage' },
    { label: '展会名录', value: 'expo' },
    { label: '手动/导入', value: 'manual' },
    { label: '批量导入', value: 'import' },
  ],
  acquireChannel: [
    {
      group: '线上 Inbound（买家主动询盘）',
      items: [
        { label: '外贸 B2B 平台（阿里国际站/中国制造网/环球资源）', value: 'b2b_platform' },
        { label: '独立站 + Google SEO', value: 'seo_site' },
        { label: 'Google Ads 付费广告', value: 'google_ads' },
        { label: '海外垂直行业平台', value: 'vertical_platform' },
      ],
    },
    {
      group: '线上 Outbound（主动开发）',
      items: [
        { label: 'LinkedIn 领英', value: 'linkedin' },
        { label: '海关数据', value: 'customs' },
        { label: '谷歌搜索挖掘', value: 'google_search' },
        { label: '邮件 / WhatsApp 开发', value: 'email_dev' },
        { label: '海外社媒（Facebook/Instagram/TikTok）', value: 'social_media' },
      ],
    },
    {
      group: '线下渠道（面对面谈单）',
      items: [
        { label: '国际专业展会', value: 'expo' },
        { label: '海外本地经销商拜访', value: 'visit' },
      ],
    },
    {
      group: '转介绍 & 合作伙伴（质量最高）',
      items: [
        { label: '老买家转介绍', value: 'referral' },
        { label: '合作伙伴推荐', value: 'partner' },
      ],
    },
  ],
  oppStage: [
    { label: '询盘', value: 'inquiry' },
    { label: '寄样', value: 'sample' },
    { label: '报价', value: 'quote' },
    { label: '谈判', value: 'negotiation' },
    { label: '成交', value: 'won' },
    { label: '流失', value: 'lost' },
  ],
};

export default api;
