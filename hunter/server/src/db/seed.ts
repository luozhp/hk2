export interface DBShape {
  leads: any[];
  companies: any[];
  contacts: any[];
  activities: any[];
  opportunities: any[];
  inquiries: any[];
  mailTemplates: any[];
  mailRecords: any[];
  keywords: any[];
  negativeKeywords: any[];
  complianceDocs: any[];
  forbiddenWords: any[];
  adCampaigns: any[];
  tasks: any[];
  users: any[];
}

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
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
    { id: 'I002', companyId: null, sourceChannel: 'platform', content: 'Interested in private label whipper', status: 'pending', slaDeadline: daysAgo(0), assignee: null, attributedKeyword: null, createdAt: daysAgo(0) },
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

  tasks: [
    { id: 'T001', title: '完善独立站证书页（MSDS/UN/DOT）', category: 'roadmap', dueDate: daysAgo(0), assignee: 'u2', status: 'todo', relatedTo: '合规' },
    { id: 'T002', title: '本周新增线索 ≥ 20 条', category: 'weekly', dueDate: daysAgo(1), assignee: 'u1', status: 'todo', relatedTo: '线索' },
    { id: 'T003', title: '发送开发信 ≥ 50 封（附 MSDS 链接）', category: 'weekly', dueDate: daysAgo(1), assignee: 'u1', status: 'done', relatedTo: '邮件' },
    { id: 'T004', title: '评估 NRA Show 展商名录购买', category: 'checklist', dueDate: daysAgo(6), assignee: 'u3', status: 'todo', relatedTo: '展会' },
    { id: 'T005', title: '跟进回复客户 BakerySupply（样品确认）', category: 'followup', dueDate: daysAgo(0), assignee: 'u2', status: 'todo', relatedTo: '客户' },
  ],
};
