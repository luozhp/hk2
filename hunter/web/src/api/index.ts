import axios from 'axios';

const http = axios.create({ baseURL: '/api', timeout: 15000 });

export const api = {
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
    remove: (id: string) => http.delete(`/keywords/${id}`).then((r) => r.data),
    negative: () => http.get('/keywords/negative').then((r) => r.data),
    addNegative: (data: any) => http.post('/keywords/negative', data).then((r) => r.data),
    removeNegative: (id: string) => http.delete(`/keywords/negative/${id}`).then((r) => r.data),
  },
  analytics: {
    funnel: () => http.get('/analytics/funnel').then((r) => r.data),
    channels: () => http.get('/analytics/channels').then((r) => r.data),
    kpi: () => http.get('/analytics/kpi').then((r) => r.data),
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
    { label: '企业黄页', value: 'yellowpage' },
    { label: '展会名录', value: 'expo' },
    { label: '手动/导入', value: 'manual' },
    { label: '批量导入', value: 'import' },
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
