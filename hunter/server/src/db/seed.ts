export interface DBShape {
  leads: any[];
  companies: any[];
  contacts: any[];
  activities: any[];
  opportunities: any[];
  inquiries: any[];
  landingPages: any[];
  mailTemplates: any[];
  mailRecords: any[];
  mailReplies: any[];
  keywords: any[];
  negativeKeywords: any[];
  complianceDocs: any[];
  complianceChecks: any[];
  forbiddenWords: any[];
  adCampaigns: any[];
  customsRecords: any[];
  tasks: any[];
  users: any[];
  /** 系统配置（独立站域名等），单条对象而非数组 */
  settings: any;
  /** 行业平台手动排序：按用户 id 存储的平台 key 顺序数组 */
  directoryOrder: Record<string, string[]>;
  /** 国际专业展会清单（界面可增删改，含发现展会） */
  fairs: any[];
  /** 客户维护档案：每客户一份（决策链 / 交易产品 / 商务信用 / 物流单证 / 合规资质 / 跟进风险） */
  maintenanceProfiles: any[];
  /** 客户维护动态：跟进 / 复购 / 寄样 / 售后 / 投诉 / 拜访 */
  maintenanceLogs: any[];
}

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

/**
 * 本地日期 YYYY-MM-DD：示例维护档案的日期字段用。
 * 不用 daysAgo(n).slice(0,10)，因为 toISOString 是 UTC，东八区会整体偏一天。
 * 传正数=未来 N 天，负数=过去 N 天。
 */
const dateStr = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const seedData: DBShape = {
  users: [
    { id: 'u1', name: '张伟', role: 'sales', email: 'sales@smileiceqi.com' },
    { id: 'u2', name: '李娜', role: 'operator', email: 'ops@smileiceqi.com' },
    { id: 'u3', name: '王总', role: 'admin', email: 'boss@smileiceqi.com' },
  ],

  leads: [
    { id: 'L001', companyName: 'FoodserviceCo', domain: 'foodserviceco.com', source: 'google', sourceNote: '搜索语法①', score: 88, grade: 'A', check1: true, check2: true, check3: true, custType: 'foodservice', assignee: 'u1', status: 'pending', createdAt: daysAgo(6), email: 'sales@foodserviceco.com' },
    { id: 'L002', companyName: 'BakerySupply', domain: 'bakerysupply.net', source: 'customs', sourceNote: 'Panjiva 导出', score: 93, grade: 'A', check1: true, check2: true, check3: true, custType: 'importer', assignee: 'u2', status: 'converted', createdAt: daysAgo(10), email: 'import@bakerysupply.net' },
    { id: 'L003', companyName: 'CreamBros', domain: 'creambros.com', source: 'yellowpage', sourceNote: 'Manta.com', score: 61, grade: 'B', check1: true, check2: false, check3: true, custType: 'ecommerce', assignee: null, status: 'pending', createdAt: daysAgo(3), email: 'info@creambros.com' },
    { id: 'L004', companyName: 'WhippedKitchen', domain: 'whippedkitchen.com', source: 'google', sourceNote: '搜索语法②', score: 74, grade: 'B', check1: true, check2: true, check3: false, custType: 'foodservice', assignee: 'u1', status: 'pending', createdAt: daysAgo(2), email: 'contact@whippedkitchen.com' },
    { id: 'L005', companyName: 'SweetTooth Brands', domain: 'sweettoothbrands.com', source: 'expo', sourceNote: 'NRA Show 名录', score: 95, grade: 'A', check1: true, check2: true, check3: true, custType: 'privateLabel', assignee: null, status: 'pending', createdAt: daysAgo(1), email: 'oem@sweettoothbrands.com' },
    { id: 'L006', companyName: 'CreamFactory Inc', domain: 'creamfactoryinc.com', source: 'google', sourceNote: '搜索语法③', score: 52, grade: 'C', check1: false, check2: true, check3: true, custType: 'importer', assignee: null, status: 'pending', createdAt: daysAgo(8), email: 'hello@creamfactoryinc.com' },
  ],

  companies: [
    {
      id: 'C001', leadId: 'L002', name: 'BakerySupply', domain: 'bakerysupply.net',
      address: '1200 Market St, Philadelphia, PA', city: 'Philadelphia', state: 'PA', country: 'US',
      website: 'https://bakerysupply.net', email: 'import@bakerysupply.net', phone: '+1-215-555-0142',
      custType: 'importer', level: 'A', tags: ['wholesale', 'bakery', 'coffee'], owner: 'u2',
      description: '烘焙原料与咖啡设备进口批发商，年进口柜量 20+',
      status: 'active', createdAt: daysAgo(10),
    },
    {
      id: 'C002', leadId: null, name: 'Sunrise Foodservice', domain: 'sunrisefoodservice.com',
      address: '890 5th Ave, Seattle, WA', city: 'Seattle', state: 'WA', country: 'US',
      website: 'https://sunrisefoodservice.com', email: 'purchasing@sunrisefoodservice.com', phone: '+1-206-555-0110',
      custType: 'foodservice', level: 'B', tags: ['foodservice', 'restaurant'], owner: 'u1',
      description: '西北地区餐饮分销商，服务咖啡馆与甜品店',
      status: 'active', createdAt: daysAgo(20),
    },
    {
      id: 'C003', leadId: null, name: 'BlueTop Imports', domain: 'bluetopimports.com',
      address: '330 Harbor Blvd, Newark, NJ', city: 'Newark', state: 'NJ', country: 'US',
      website: 'https://bluetopimports.com', email: 'info@bluetopimports.com', phone: '+1-973-555-0188',
      custType: 'importer', level: 'B', tags: ['importer', 'n2o'], owner: null,
      description: '东海岸食品级气体类产品进口商',
      status: 'active', createdAt: daysAgo(35),
    },
    {
      id: 'C004', leadId: null, name: 'CloudDessert Brands', domain: 'clouddessertbrands.com',
      address: '400 Mission St, San Francisco, CA', city: 'San Francisco', state: 'CA', country: 'US',
      website: 'https://clouddessertbrands.com', email: 'oem@clouddessertbrands.com', phone: '+1-415-555-0166',
      custType: 'privateLabel', level: 'A', tags: ['private-label', 'oem'], owner: 'u3',
      description: '本土甜品设备品牌，寻求 OEM 贴牌奶油枪',
      status: 'active', createdAt: daysAgo(15),
    },
  ],

  contacts: [
    { id: 'CT001', companyId: 'C001', name: 'Robert Miller', titleRole: 'import', title: 'Import Manager', linkedin: 'https://linkedin.com/in/robertmiller', email: 'import@bakerysupply.net', phone: '+1-215-555-0142', touchStatus: 'replied', createdAt: daysAgo(9) },
    { id: 'CT002', companyId: 'C001', name: 'Susan Lee', titleRole: 'purchasing', title: 'Purchasing Manager', linkedin: 'https://linkedin.com/in/susanlee', email: 'buy@bakerysupply.net', phone: null, touchStatus: 'untouched', createdAt: daysAgo(9) },
    { id: 'CT003', companyId: 'C002', name: 'James Carter', titleRole: 'owner', title: 'Owner / CEO', linkedin: 'https://linkedin.com/in/jamescarter', email: 'james@sunrisefoodservice.com', phone: '+1-206-555-0110', touchStatus: 'untouched', createdAt: daysAgo(19) },
    { id: 'CT004', companyId: 'C003', name: 'Dana Park', titleRole: 'category', title: 'Category Manager', linkedin: 'https://linkedin.com/in/danapark', email: 'dana@bluetopimports.com', phone: null, touchStatus: 'linkedin', createdAt: daysAgo(34) },
    { id: 'CT005', companyId: 'C004', name: 'Elena Rossi', titleRole: 'owner', title: 'Founder', linkedin: 'https://linkedin.com/in/elenarossi', email: 'elena@clouddessertbrands.com', phone: '+1-415-555-0166', touchStatus: 'untouched', createdAt: daysAgo(14) },
  ],

  activities: [
    { id: 'A001', companyId: 'C001', contactId: 'CT001', type: 'email', content: '发送首封开发信（模板A）', createdAt: daysAgo(8), operator: 'u2' },
    { id: 'A002', companyId: 'C001', contactId: 'CT001', type: 'email', content: '客户回复：请提供 MSDS 与样品', createdAt: daysAgo(7), operator: 'system' },
    { id: 'A003', companyId: 'C001', contactId: 'CT001', type: 'email', content: '发送 MSDS 链接 + 样品单', createdAt: daysAgo(6), operator: 'u2' },
    { id: 'A004', companyId: 'C002', contactId: 'CT003', type: 'note', content: 'LinkedIn 添加好友，等待通过', createdAt: daysAgo(5), operator: 'u1' },
    { id: 'A005', companyId: 'C004', contactId: 'CT005', type: 'email', content: '发送 OEM/ODM 能力介绍', createdAt: daysAgo(3), operator: 'u3' },
  ],

  opportunities: [
    { id: 'O001', companyId: 'C001', stage: 'quote', title: '气弹首批 5 柜', amount: 120000, expectedDate: '2026-10-15', source: '主动开发', createdAt: daysAgo(7) },
    { id: 'O002', companyId: 'C004', stage: 'sample', title: 'OEM 奶油枪 3000 支', amount: 45000, expectedDate: '2026-12-01', source: '开发信', createdAt: daysAgo(3) },
    { id: 'O003', companyId: 'C002', stage: 'inquiry', title: '询盘-批发报价', amount: 20000, expectedDate: '2026-09-30', source: '独立站', createdAt: daysAgo(1) },
  ],

  inquiries: [
    { id: 'I001', companyId: 'C002', sourceChannel: 'seo', content: 'Requesting bulk price list for cream chargers', status: 'processing', slaDeadline: daysAgo(1), assignee: 'u1', attributedKeyword: 'cream charger wholesale USA', createdAt: daysAgo(1) },
    { id: 'I002', companyId: null, sourceChannel: 'platform', content: 'Interested in private label whipper', status: 'pending', slaDeadline: daysAgo(0), assignee: null, attributedKeyword: null, landingPage: '/oem', contactEmail: null, createdAt: daysAgo(0) },
  ],

  landingPages: [
    {
      id: 'LP001', path: '/wholesale', title: 'Wholesale Cream Chargers – Bulk Supplier USA',
      intent: '批量采购 / 批发询价', goal: '提交批量报价申请（MOQ + 阶梯价）',
      status: 'online', owner: 'u2', updatedAt: daysAgo(2),
      modules: ['工厂实拍与产能', '合规资质 MSDS / UN-DOT', 'MOQ 与阶梯报价表', '邮箱 + 表单 + WhatsApp'],
    },
    {
      id: 'LP002', path: '/oem', title: 'OEM & Private Label Cream Charger Manufacturer',
      intent: '贴牌代工 / 自有品牌', goal: '提交 OEM 需求（规格、起订量、设计稿）',
      status: 'draft', owner: 'u2', updatedAt: daysAgo(1),
      modules: ['OEM/ODM 流程图', '合规资质 MSDS / UN-DOT', '贴牌案例'],
    },
  ],

  mailTemplates: [
    {
      id: 'T001', name: '首封开发信（标准4段式）', category: 'first',
      subject: 'Food-grade N2O Cream Charger Wholesale | OEM/ODM Factory',
      body: `Hi {{contactName}},

I'm {{senderName}} from {{senderCompany}}, a Chinese manufacturer specializing in food-grade N2O cream chargers and cream whippers for the foodservice and café industry. We support OEM/ODM with flexible MOQs.

Our products are food-grade certified, and we provide full MSDS and UN-DOT documentation required for USA import — available here: {{msdsLink}}

We supply bulk wholesale quantities with sample options. You can find our factory profile and full product range at {{websiteLink}}

Would you be interested in receiving our quotation & samples?

Best regards,
{{senderName}} | {{senderCompany}}`,
      isActive: true, createdAt: daysAgo(30),
    },
    {
      id: 'T002', name: '跟进信（资料发送后）', category: 'followup',
      subject: 'Re: Food-grade N2O Cream Charger Wholesale',
      body: `Hi {{contactName}},

Just following up on the MSDS and UN-DOT documents I shared earlier. Have you had a chance to review them?

We can arrange samples within 5 working days and provide a tiered quotation based on container quantities. Happy to schedule a quick call.

Best regards,
{{senderName}}`,
      isActive: true, createdAt: daysAgo(30),
    },
    {
      id: 'T003', name: 'OEM/ODM 合作信', category: 'oem',
      subject: 'OEM/ODM Cream Whipper Manufacturer Partner',
      body: `Hi {{contactName}},

As a factory with 10+ years of OEM experience, we can support your private label cream whipper line with custom branding, packaging and compliance documentation.

We would love to learn about your product requirements. Please find our factory capabilities at {{websiteLink}}/oem

Best regards,
{{senderName}}`,
      isActive: true, createdAt: daysAgo(30),
    },
  ],

  mailRecords: [
    { id: 'M001', templateId: 'T001', companyId: 'C001', contactId: 'CT001', subject: 'Food-grade N2O Cream Charger Wholesale | OEM/ODM Factory', status: 'replied', sentAt: daysAgo(8), openedAt: daysAgo(8), repliedAt: daysAgo(7), sender: 'u2' },
    { id: 'M002', templateId: 'T001', companyId: 'C002', contactId: 'CT003', subject: 'Food-grade N2O Cream Charger Wholesale | OEM/ODM Factory', status: 'opened', sentAt: daysAgo(5), openedAt: daysAgo(5), repliedAt: null, sender: 'u1' },
    { id: 'M003', templateId: 'T003', companyId: 'C004', contactId: 'CT005', subject: 'OEM/ODM Cream Whipper Manufacturer Partner', status: 'sent', sentAt: daysAgo(3), openedAt: null, repliedAt: null, sender: 'u3' },
    { id: 'M004', templateId: 'T001', companyId: 'C003', contactId: 'CT004', subject: 'Food-grade N2O Cream Charger Wholesale | OEM/ODM Factory', status: 'opened', sentAt: daysAgo(4), openedAt: daysAgo(4), repliedAt: null, sender: 'u2' },
    { id: 'M005', templateId: 'T002', companyId: 'C001', contactId: 'CT001', subject: 'Re: Food-grade N2O Cream Charger Wholesale', status: 'replied', sentAt: daysAgo(6), openedAt: daysAgo(6), repliedAt: daysAgo(6), sender: 'u2' },
  ],

  mailReplies: [
    {
      id: 'R001', companyId: 'C001', contactId: null,
      fromEmail: 'import@bakerysupply.net', fromName: 'Robert Miller',
      toEmail: 'sales@smileiceqi.com',
      subject: 'Re: Food-grade N2O Cream Charger Wholesale | OEM/ODM Factory',
      snippet: 'Thanks for the introduction. We usually import 2-3 containers per quarter. Could you share your MOQ and the price list for 50-piece and 100-piece packaging?',
      body: 'Hi Sales Team,\n\nThanks for the introduction. We usually import 2-3 containers per quarter from Asia. Could you share your MOQ and the price list for 50-piece and 100-piece packaging? Also, do you support private label for the chargers?\n\nBest,\nRobert Miller\nImport Manager\nBakerySupply',
      messageId: 'seed_r001', isRead: false, source: 'seed', receivedAt: daysAgo(1),
    },
    {
      id: 'R002', companyId: 'C004', contactId: null,
      fromEmail: 'oem@clouddessertbrands.com', fromName: 'Michelle Nguyen',
      toEmail: 'sales@smileiceqi.com',
      subject: 'Re: OEM/ODM Cream Whipper Manufacturer Partner',
      snippet: 'We are evaluating suppliers for our private label cream whipper line. Can you send the OEM catalog and minimum order details for custom branding?',
      body: 'Hello,\n\nWe are evaluating suppliers for our private label cream whipper line launching next year. Can you send the OEM catalog and minimum order details for custom branding? We would also like to review your ISO certificates.\n\nThanks,\nMichelle Nguyen\nProduct Director\nCloudDessert Brands',
      messageId: 'seed_r002', isRead: true, source: 'seed', receivedAt: daysAgo(3),
    },
  ],

  keywords: [
    { id: 'K001', keyword: 'cream charger wholesale USA', category: 'head', intent: 'B', landingPage: '/wholesale', rank: 12, status: 'tracking' },
    { id: 'K002', keyword: 'food-grade n2o cream charger supplier', category: 'head', intent: 'B', landingPage: '/wholesale', rank: 8, status: 'tracking' },
    { id: 'K003', keyword: 'cream whipper OEM manufacturer', category: 'head', intent: 'B', landingPage: '/oem', rank: 15, status: 'tracking' },
    { id: 'K004', keyword: 'bulk whipped cream chargers for foodservice', category: 'longtail', intent: 'B', landingPage: '/wholesale', rank: null, status: 'tracking' },
    { id: 'K005', keyword: 'wholesale cream chargers bulk price', category: 'longtail', intent: 'B', landingPage: '/wholesale', rank: null, status: 'pending' },
    { id: 'K006', keyword: 'private label cream charger manufacturer', category: 'longtail', intent: 'B', landingPage: '/oem', rank: null, status: 'pending' },
  ],

  negativeKeywords: [
    { id: 'N001', keyword: 'whip charger', channel: 'google-ads', note: '过滤吸食相关垃圾流量' },
    { id: 'N002', keyword: 'whip gas', channel: 'google-ads', note: '过滤吸食相关垃圾流量' },
    { id: 'N003', keyword: 'recreational', channel: 'all', note: '合规红线' },
    { id: 'N004', keyword: 'whip it', channel: 'all', note: '合规红线' },
  ],

  complianceChecks: [
    { key: 'factory', label: '工厂介绍页（实拍/产能/年限）', module: '独立站', done: true },
    { key: 'cert', label: 'MSDS、UN/DOT 证书展示', module: '独立站', done: true },
    { key: 'oem', label: 'OEM/ODM 说明页', module: '独立站', done: false },
    { key: 'moq', label: 'MOQ 与批量报价入口', module: '独立站', done: false },
    { key: 'email', label: '邮件均附 MSDS 与 UN-DOT 链接', module: '邮件', done: true },
    { key: 'ads', label: '广告否定词已配置（whip charger/gas）', module: '广告', done: false },
    { key: 'copy', label: '全渠道文案使用 culinary/foodservice 口径', module: '内容', done: true },
  ],

  complianceDocs: [
    { id: 'D001', docType: 'MSDS', name: 'N2O Charger MSDS (EN)', file: 'msds_n2o_en.pdf', publicLink: '/docs/msds', version: 'v3.2', expireDate: '2027-06-30', status: 'valid' },
    { id: 'D002', docType: 'UN', name: 'UN 1013 危险品运输认证', file: 'un1013_cert.pdf', publicLink: '/docs/un', version: 'v2.1', expireDate: '2027-03-15', status: 'valid' },
    { id: 'D003', docType: 'DOT', name: 'US DOT Special Permit', file: 'dot_permit.pdf', publicLink: '/docs/dot', version: 'v1.0', expireDate: '2026-12-31', status: 'expiring' },
    { id: 'D004', docType: 'FOOD', name: 'FDA Food Contact Certificate', file: 'fda_fc.pdf', publicLink: '/docs/fda', version: 'v1.2', expireDate: '2028-01-31', status: 'valid' },
    { id: 'D005', docType: 'ISO', name: 'ISO 9001 质量体系认证', file: 'iso9001.pdf', publicLink: '/docs/iso', version: 'v2.0', expireDate: '2027-09-30', status: 'valid' },
  ],

  forbiddenWords: [
    { id: 'F001', word: 'recreational', replacement: 'culinary / foodservice', isActive: true },
    { id: 'F002', word: 'whip gas', replacement: 'whipping cream charger', isActive: true },
    { id: 'F003', word: 'whip charger', replacement: 'cream charger', isActive: true },
    { id: 'F004', word: 'whip it', replacement: '—', isActive: true },
    { id: 'F005', word: 'inhalation', replacement: '—', isActive: true },
  ],

  adCampaigns: [
    { id: 'AD001', name: 'US 批发关键词（测试）', budgetDaily: 40, keywords: ['cream charger wholesale', 'n2o charger supplier'], negativeKeywords: ['whip charger', 'whip gas'], status: 'paused', startDate: daysAgo(20), spent: 320, clicks: 18, impressions: 12400, ctr: 0.145, conversions: 1 },
  ],

  customsRecords: [],

  tasks: [
    { id: 'T001', title: '完善独立站证书页（MSDS/UN/DOT）', category: 'roadmap', dueDate: daysAgo(0), assignee: 'u2', status: 'todo', relatedTo: '合规' },
    { id: 'T002', title: '本周新增线索 ≥ 20 条', category: 'weekly', dueDate: daysAgo(1), assignee: 'u1', status: 'todo', relatedTo: '线索' },
    { id: 'T003', title: '发送开发信 ≥ 50 封（附 MSDS 链接）', category: 'weekly', dueDate: daysAgo(1), assignee: 'u1', status: 'done', relatedTo: '邮件' },
    { id: 'T004', title: '评估 NRA Show 展商名录购买', category: 'checklist', dueDate: daysAgo(6), assignee: 'u3', status: 'todo', relatedTo: '展会' },
    { id: 'T005', title: '跟进回复客户 BakerySupply（样品确认）', category: 'followup', dueDate: daysAgo(0), assignee: 'u2', status: 'todo', relatedTo: '客户' },
  ],

  fairs: [
    { id: 'CANTON', name: '广交会（中国进出口商品交易会）', enName: 'Canton Fair', region: '中国 · 广州', industry: '综合进出口 / 食品机械', city: '广州', country: 'CN', website: 'https://www.cantonfair.org.cn', period: '每年春(4月) / 秋(10月)两届', dateStart: '2026-04-15', dateEnd: '2026-05-05', fetchable: true, note: '全球最大贸易展会，参展商以出口型制造商为主。可从「参展商名录」按行业筛选食品机械、餐饮设备类展商。', productHints: ['cream charger', 'cream whipper', 'whipped cream', 'n2o charger', 'food machine', 'kitchen equipment'] },
    { id: 'NRA', name: 'NRA Show', enName: 'NRA Show', region: '美国 · 芝加哥', industry: '餐饮 / 食品服务', city: 'Chicago, IL', country: 'US', website: 'https://www.nrashow.org', period: '每年 5 月', dateStart: '2026-05-16', dateEnd: '2026-05-19', fetchable: true, note: '美国餐饮业协会主办，北美最大餐饮设备与食材展，适合开发餐饮分销商与批发商。', productHints: ['cream charger', 'cream whipper', 'foodservice', 'restaurant equipment', 'wholesale distributor'] },
    { id: 'ANUGA', name: 'Anuga', enName: 'Anuga', region: '德国 · 科隆', industry: '食品 / 饮料', city: 'Cologne', country: 'DE', website: 'https://www.anuga.com', period: '双年（偶数年）10 月', dateStart: '2026-10-10', dateEnd: '2026-10-14', fetchable: true, note: '全球最大食品饮料展，欧洲食品进口商与品牌商集中地。', productHints: ['cream charger', 'food importer', 'beverage', 'private label', 'food distributor'] },
    { id: 'HOST', name: 'HostMilano', enName: 'HostMilano', region: '意大利 · 米兰', industry: '酒店 / 餐饮设备', city: 'Milan', country: 'IT', website: 'https://www.host.fieramilano.it', period: '双年（奇数年）10 月', dateStart: '2026-10-22', dateEnd: '2026-10-26', fetchable: true, note: '酒店餐饮与食品设备展，欧洲设备品牌与分销商密集。', productHints: ['cream whipper', 'hotel equipment', 'catering', 'hospitality supply'] },
    { id: 'GULFOOD', name: 'Gulfood', enName: 'Gulfood', region: '阿联酋 · 迪拜', industry: '食品 / 进口', city: 'Dubai', country: 'AE', website: 'https://www.gulfood.com', period: '每年 2 月', dateStart: '2026-02-16', dateEnd: '2026-02-20', fetchable: true, note: '中东最大食品展，中东进口商与经销商集中。', productHints: ['food importer', 'cream charger', 'wholesale food', 'distributor'] },
    { id: 'FHA', name: 'FHA Food & Beverage', enName: 'FHA', region: '新加坡', industry: '酒店 / 餐饮', city: 'Singapore', country: 'SG', website: 'https://www.fha.sg', period: '双年 9 月', dateStart: '2026-09-01', dateEnd: '2026-09-05', fetchable: true, note: '亚太酒店餐饮展，东南亚分销商聚集。', productHints: ['cream charger', 'catering', 'hospitality', 'f&b supply'] },
    { id: 'IFFA', name: 'IFFA', enName: 'IFFA', region: '德国 · 法兰克福', industry: '食品加工技术', city: 'Frankfurt', country: 'DE', website: 'https://www.iffa.com', period: '三年一届（偶数年）', dateStart: '2026-05-02', dateEnd: '2026-05-07', fetchable: true, note: '肉类与食品加工技术展，设备制造商集中。', productHints: ['food processing', 'meat processing', 'food machine', 'processing equipment'] },
  ],

  /** 客户维护档案示例（覆盖活跃 / 需关注 / 沉睡 / OEM 等不同维护状态） */
  maintenanceProfiles: [
    {
      id: 'MP_C001', companyId: 'C001',
      timezone: 'America/New_York（UTC-5，夏令时 UTC-4）', language: 'English',
      keyContacts: [
        { name: 'Robert Miller', role: '决策者', title: 'Import Manager', email: 'import@bakerysupply.net', phone: '+1-215-555-0142', whatsapp: '', wechat: '', birthday: '1978-06-12', isKey: true },
        { name: 'Susan Lee', role: '使用者/采购执行', title: 'Purchasing Manager', email: 'buy@bakerysupply.net', phone: '', whatsapp: '+1-215-555-0188', wechat: '', birthday: '', isKey: false },
      ],
      decisionProcess: 'Robert 拍板定供应商，Susan 负责下单与对账',
      mainProducts: '烘焙原料、咖啡设备、奶油气弹（N2O 8g）',
      ourSkus: 'N2O 气弹 8g（50 支 / 100 支装）、奶油枪 0.5L',
      priceLevel: 'A 级客户价', targetPrice: '0.27 USD/支（100 支装）', lastPrice: '0.29 USD/支（100 支装）',
      moq: '50,000 支（约 1×20GP）',
      annualVolume: '8-10 柜/年', annualAmount: 480000,
      purchaseCycle: '季度（Q1 / Q2 / Q4）', peakSeason: 'Q4（圣诞烘焙旺季，需提前 60 天备货）',
      lastOrderDate: dateStr(-45), lastOrderAmount: 96000, totalOrderAmount: 352000, orderCount: 4,
      nextReorderDate: dateStr(20),
      oem: '暂不需要，使用我方中性包装', packagingReq: '英文彩盒，需标注 Net Wt 与 UN1070 警示',
      paymentTerm: 'T/T 30% 定金 + 70% 见提单副本', creditDays: 0, creditLimit: 100000, currency: 'USD', incoterm: 'FOB Ningbo',
      settlementScore: 'good', overdueAmount: 0, overdueCount: 0,
      discountPolicy: '单笔 ≥2 柜享 2% 数量折扣', rebatePolicy: '年度 ≥8 柜返 1%',
      agreementNo: 'BAK-2026-AA', agreementExpiry: '2026-12-31', priceValidity: '报价 30 天有效；氧化亚氮原料涨价超 5% 可重议',
      destinationPort: 'Philadelphia, PA', forwarder: '客户指定货代 C.H. Robinson', customsBroker: '客户自理',
      requiredDocs: ['商业发票', '装箱单', '提单', 'MSDS', '危险品包装证明', 'FORM E'],
      leadTimeDays: 25, packagingMethod: '100 支/盒，10 盒/箱（1000 支/箱）', shippingMark: 'BAKERY SUPPLY / PO# / C/NO.1-UP',
      specialReq: '危险品 UN1070（N2O），需危包证与危险品舱位，禁止与普通货混装',
      taxId: 'EIN 23-1xxxxxx', vatNumber: '', eori: '', importLicense: '食品接触材料进口备案已完成',
      certifications: [{ name: 'FDA 食品接触注册', expiry: '2027-03-31' }, { name: 'ISO 9001（工厂）', expiry: '2027-06-30' }],
      lastContactDate: dateStr(-6), nextFollowUpDate: dateStr(3), followUpChannel: '邮件',
      followUpNote: '确认 Q4 备货 2 柜，客户 10 月中旬前下单',
      bestContactTime: '美东时间 9:00-11:00', communicationPref: '邮件为主，紧急事项电话',
      satisfaction: 5, complaintCount: 1, afterSalesNote: '外箱破损 3 箱已补发并加固包装', riskLevel: '低',
      riskNote: '付款记录良好；需注意 Q4 危险品舱位紧张，提前订舱',
      status: 'active', createdAt: daysAgo(60), updatedAt: daysAgo(6),
    },
    {
      id: 'MP_C002', companyId: 'C002',
      timezone: 'America/Los_Angeles（UTC-8）', language: 'English',
      keyContacts: [
        { name: 'James Carter', role: '决策者', title: 'Owner / CEO', email: 'james@sunrisefoodservice.com', phone: '+1-206-555-0110', whatsapp: '', wechat: '', birthday: '', isKey: true },
      ],
      decisionProcess: '老板一人决策，价格敏感',
      mainProducts: '餐饮一次性耗材、奶油气弹', ourSkus: 'N2O 气弹 8g（50 支装）',
      priceLevel: 'B 级客户价', targetPrice: '0.31 USD/支', lastPrice: '0.33 USD/支', moq: '20,000 支',
      annualVolume: '3-4 柜/年', annualAmount: 120000,
      purchaseCycle: '半年', peakSeason: '夏季（冰淇淋 / 冷饮需求）',
      lastOrderDate: dateStr(-120), lastOrderAmount: 38000, totalOrderAmount: 76000, orderCount: 2,
      nextReorderDate: dateStr(15),
      oem: '需要中性包装', packagingReq: '简装 PE 袋 + 外箱',
      paymentTerm: 'T/T 100% 发货前', creditDays: 0, creditLimit: 40000, currency: 'USD', incoterm: 'FOB Ningbo',
      settlementScore: 'normal', overdueAmount: 0, overdueCount: 1,
      discountPolicy: '', rebatePolicy: '', agreementNo: '', agreementExpiry: '', priceValidity: '报价 15 天有效',
      destinationPort: 'Seattle, WA', forwarder: '我方推荐货代', customsBroker: '客户自理',
      requiredDocs: ['商业发票', '装箱单', '提单', 'MSDS'],
      leadTimeDays: 20, packagingMethod: '50 支/盒，20 盒/箱', shippingMark: 'SUNRISE / C/NO.',
      specialReq: '危险品 UN1070，需危包证',
      taxId: '', vatNumber: '', eori: '', importLicense: '',
      certifications: [{ name: 'MSDS（随货）', expiry: '' }],
      lastContactDate: dateStr(-38), nextFollowUpDate: dateStr(2), followUpChannel: '电话',
      followUpNote: '上次报价偏高未成交，夏季前推一次促销价激活',
      bestContactTime: '太平洋时间 10:00-12:00', communicationPref: '电话 + 邮件',
      satisfaction: 4, complaintCount: 1, afterSalesNote: '曾反馈 200 支气弹漏气，已补发并附质检报告',
      riskLevel: '中', riskNote: '价格敏感，易被同行低价撬单；付款偶有拖延',
      status: 'watch', createdAt: daysAgo(90), updatedAt: daysAgo(38),
    },
    {
      id: 'MP_C004', companyId: 'C004',
      timezone: 'America/Los_Angeles（UTC-8）', language: 'English',
      keyContacts: [
        { name: 'Elena Rossi', role: '决策者', title: 'Founder', email: 'elena@clouddessertbrands.com', phone: '+1-415-555-0166', whatsapp: '+1-415-555-0166', wechat: '', birthday: '1990-11-02', isKey: true },
      ],
      decisionProcess: '创始人决策，设计与品控共同参与',
      mainProducts: '自有品牌甜品设备（奶油枪 + 气弹套装）', ourSkus: 'OEM 奶油枪 0.5L（定制 logo + 彩盒）',
      priceLevel: 'OEM 项目价', targetPrice: '4.80 USD/支（枪体）', lastPrice: '5.20 USD/支', moq: '3,000 支（首单）',
      annualVolume: '1-2 万支/年', annualAmount: 90000,
      purchaseCycle: '季度（跟随新品上市节奏）', peakSeason: 'Q4 礼品季',
      lastOrderDate: '', lastOrderAmount: 0, totalOrderAmount: 0, orderCount: 0,
      nextReorderDate: dateStr(25),
      oem: '需要 OEM：激光 logo、定制彩盒与说明书', packagingReq: '按客户设计稿，需先签保密协议',
      paymentTerm: 'T/T 50% 定金 + 50% 发货前', creditDays: 0, creditLimit: 50000, currency: 'USD', incoterm: 'EXW Ningbo',
      settlementScore: 'normal', overdueAmount: 0, overdueCount: 0,
      discountPolicy: '首单不打折，返单 5,000 支起降 3%', rebatePolicy: '', agreementNo: '', agreementExpiry: '',
      priceValidity: '模具费另计，报价 30 天有效',
      destinationPort: 'Oakland, CA', forwarder: '客户指定', customsBroker: '客户自理',
      requiredDocs: ['商业发票', '装箱单', '提单', '质检报告', '品牌授权书'],
      leadTimeDays: 35, packagingMethod: '独立彩盒 + 说明书，24 支/箱', shippingMark: 'CLOUD DESSERT / SKU / C/NO.',
      specialReq: '气弹需与枪体同柜发运，注意 UN1070 申报',
      taxId: '', vatNumber: '', eori: '', importLicense: '',
      certifications: [{ name: 'FDA 食品接触', expiry: '2027-01-31' }],
      lastContactDate: dateStr(-3), nextFollowUpDate: dateStr(5), followUpChannel: '邮件',
      followUpNote: 'OEM 打样 3 支已寄出，等待确认外观与手感',
      bestContactTime: '太平洋时间 9:00-11:00', communicationPref: '邮件 + WhatsApp',
      satisfaction: 5, complaintCount: 0, afterSalesNote: '', riskLevel: '低',
      riskNote: '样品确认周期长，需持续跟进防止项目搁置',
      status: 'active', createdAt: daysAgo(30), updatedAt: daysAgo(3),
    },
    {
      id: 'MP_C003', companyId: 'C003',
      timezone: 'America/New_York（UTC-5）', language: 'English',
      keyContacts: [
        { name: 'Dana Park', role: '影响者', title: 'Category Manager', email: 'dana@bluetopimports.com', phone: '', whatsapp: '', wechat: '', birthday: '', isKey: false },
      ],
      decisionProcess: '品类经理推荐，总部采购最终决策（决策链长）',
      mainProducts: '食品级气体（N2O / CO2）', ourSkus: 'N2O 气弹 8g',
      priceLevel: 'B 级客户价', targetPrice: '0.30 USD/支', lastPrice: '', moq: '100,000 支',
      annualVolume: '待评估', annualAmount: 0,
      purchaseCycle: '未确定', peakSeason: '',
      lastOrderDate: '', lastOrderAmount: 0, totalOrderAmount: 0, orderCount: 0, nextReorderDate: '',
      oem: '', packagingReq: '',
      paymentTerm: '', creditDays: 0, creditLimit: 0, currency: 'USD', incoterm: '',
      settlementScore: 'normal', overdueAmount: 0, overdueCount: 0,
      discountPolicy: '', rebatePolicy: '', agreementNo: '', agreementExpiry: '', priceValidity: '',
      destinationPort: 'Newark, NJ', forwarder: '', customsBroker: '',
      requiredDocs: [], leadTimeDays: 0, packagingMethod: '', shippingMark: '', specialReq: '危险品 UN1070',
      taxId: '', vatNumber: '', eori: '', importLicense: '需确认气体进口资质',
      certifications: [],
      lastContactDate: dateStr(-96), nextFollowUpDate: dateStr(1), followUpChannel: '邮件',
      followUpNote: '长期未回复，尝试换联系人或电话触达',
      bestContactTime: '', communicationPref: '邮件',
      satisfaction: 3, complaintCount: 0, afterSalesNote: '', riskLevel: '高',
      riskNote: '超 90 天未有效沟通且无负责人，流失风险高',
      status: 'dormant', createdAt: daysAgo(120), updatedAt: daysAgo(96),
    },
  ],

  /** 客户维护动态示例 */
  maintenanceLogs: [
    { id: 'ML001', companyId: 'C001', type: 'reorder', content: '复购 2 柜 N2O 气弹（100 支装，共 200,000 支）', amount: 96000, operator: 'u2', nextDate: '', createdAt: daysAgo(45) },
    { id: 'ML002', companyId: 'C001', type: 'follow', content: '邮件跟进 Q4 备货计划，客户确认 10 月中旬再下 2 柜', amount: 0, operator: 'u2', nextDate: dateStr(3), createdAt: daysAgo(6) },
    { id: 'ML003', companyId: 'C001', type: 'complaint', content: '上批货外箱破损 3 箱，已协商下柜补 3 箱并加固包装', amount: 0, operator: 'u2', nextDate: '', createdAt: daysAgo(80) },
    { id: 'ML004', companyId: 'C004', type: 'sample', content: '寄出 OEM 打样奶油枪 3 支（含定制 logo 与彩盒），DHL 单号 1234567890', amount: 0, operator: 'u3', nextDate: dateStr(5), createdAt: daysAgo(10) },
    { id: 'ML005', companyId: 'C004', type: 'visit', content: '视频会议：确认 OEM 模具方案与交期 35 天', amount: 0, operator: 'u3', nextDate: '', createdAt: daysAgo(3) },
    { id: 'ML006', companyId: 'C002', type: 'aftersale', content: '客户反馈 200 支气弹漏气，已补发 200 支并附质检报告，客户接受', amount: 0, operator: 'u1', nextDate: '', createdAt: daysAgo(50) },
  ],

  settings: {
    siteUrl: 'https://smileiceqi.com',
    brandName: 'Smile Ice Qi Co., Ltd.',
  },
  directoryOrder: {},
};
