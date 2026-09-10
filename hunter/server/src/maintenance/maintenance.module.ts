import { Controller, Get, Post, Put, Delete, Query, Body, Param, Module, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

const DAY = 24 * 60 * 60 * 1000;

/** 本地日期 YYYY-MM-DD：避免 toISOString() 的 UTC 偏移导致日期差一天（东八区尤其明显） */
function todayStr(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 距今天数：正数 = 已过去 N 天，负数 = 还有 N 天到；空值返回 null */
function daysFromNow(date?: string | null): number | null {
  if (!date) return null;
  const t = new Date(`${String(date).slice(0, 10)}T00:00:00`).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / DAY);
}

/** 宽松取数：'1,000' / 1000 / '1000元' 都能转数字 */
function toNum(v: any): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * 默认空档案：外贸客户维护所需的完整字段集。
 * 任何客户首次进入维护页都会自动生成，保证「有客户就能维护」。
 */
function blankProfile(companyId: string) {
  const now = new Date().toISOString();
  return {
    id: `MP_${companyId}`,
    companyId,
    // 一、客户与决策链
    timezone: '',
    language: '',
    keyContacts: [] as any[],
    decisionProcess: '',
    // 二、交易与产品
    mainProducts: '',
    ourSkus: '',
    priceLevel: '',
    targetPrice: '',
    lastPrice: '',
    moq: '',
    annualVolume: '',
    annualAmount: 0,
    purchaseCycle: '',
    peakSeason: '',
    lastOrderDate: '',
    lastOrderAmount: 0,
    totalOrderAmount: 0,
    orderCount: 0,
    nextReorderDate: '',
    oem: '',
    packagingReq: '',
    // 三、商务与信用
    paymentTerm: '',
    creditDays: 0,
    creditLimit: 0,
    currency: 'USD',
    incoterm: '',
    settlementScore: 'normal',
    overdueAmount: 0,
    overdueCount: 0,
    discountPolicy: '',
    rebatePolicy: '',
    agreementNo: '',
    agreementExpiry: '',
    priceValidity: '',
    // 四、物流与单证
    destinationPort: '',
    forwarder: '',
    customsBroker: '',
    requiredDocs: [] as string[],
    leadTimeDays: 0,
    packagingMethod: '',
    shippingMark: '',
    specialReq: '',
    // 五、合规与资质
    taxId: '',
    vatNumber: '',
    eori: '',
    importLicense: '',
    certifications: [] as any[],
    // 六、沟通与跟进
    lastContactDate: '',
    nextFollowUpDate: '',
    followUpChannel: '',
    followUpNote: '',
    bestContactTime: '',
    communicationPref: '',
    // 七、售后与风险
    satisfaction: 5,
    complaintCount: 0,
    afterSalesNote: '',
    riskLevel: '低',
    riskNote: '',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

@Injectable()
class MaintenanceService {
  constructor(private db: DbService) {}

  /** 取档案，不存在则自动创建空档案 */
  private ensureProfile(companyId: string) {
    const list = this.db.db.maintenanceProfiles;
    let p = list.find((x) => x.companyId === companyId);
    if (!p) {
      p = blankProfile(companyId) as any;
      list.push(p);
      this.db.save();
    }
    return p;
  }

  /** 维护指标：跟进逾期 / 复购倒计时 / 协议到期 / 证件到期 / 流失风险 / RFM */
  private metrics(_company: any, p: any) {
    const lastContactRaw = daysFromNow(p.lastContactDate);
    const lastOrderRaw = daysFromNow(p.lastOrderDate);
    const followRaw = daysFromNow(p.nextFollowUpDate);
    const reorderRaw = daysFromNow(p.nextReorderDate);
    const agreementRaw = daysFromNow(p.agreementExpiry);

    // 逾期跟进天数：下次跟进日已过 → 正数
    const followOverdueDays = followRaw !== null && followRaw > 0 ? followRaw : 0;
    // 距下次跟进还有几天：未来 → 正数
    const followDueDays = followRaw !== null && followRaw <= 0 ? -followRaw : null;
    // 距预计复购还有几天
    const reorderInDays = reorderRaw === null ? null : -reorderRaw;
    // 距年框协议到期还有几天
    const agreementLeftDays = agreementRaw === null ? null : -agreementRaw;

    // 流失风险：主要看最近联系与最近成交
    let churnRisk = 'low';
    if (lastContactRaw === null) {
      churnRisk = toNum(p.orderCount) > 0 ? 'medium' : 'unknown';
    } else if (lastContactRaw > 90 || (lastOrderRaw !== null && lastOrderRaw > 180)) {
      churnRisk = 'high';
    } else if (lastContactRaw > 45) {
      churnRisk = 'medium';
    }

    const certExpiringCount = (p.certifications || []).filter((c: any) => {
      const d = daysFromNow(c?.expiry);
      return d !== null && -d >= 0 && -d <= 60;
    }).length;

    return {
      lastContactDays: lastContactRaw,
      lastOrderDays: lastOrderRaw,
      followOverdueDays,
      followDueDays,
      reorderInDays,
      agreementLeftDays,
      certExpiringCount,
      churnRisk,
      rfm: {
        recency: lastOrderRaw,
        frequency: toNum(p.orderCount),
        monetary: toNum(p.totalOrderAmount),
      },
    };
  }

  private buildRow(company: any) {
    const profile = this.ensureProfile(company.id);
    return {
      companyId: company.id,
      companyName: company.name,
      domain: company.domain,
      country: company.country,
      city: company.city,
      custType: company.custType,
      level: company.level,
      source: company.source,
      owner: company.owner,
      createdAt: company.createdAt,
      profile,
      ...this.metrics(company, profile),
    };
  }

  /** 维护看板：外贸最关心的待跟进 / 待复购 / 到期 / 风险 */
  overview() {
    const rows = this.db.db.companies.map((c) => this.buildRow(c));
    const sum = (fn: (r: any) => number) => rows.reduce((a, r) => a + fn(r), 0);
    const byStatus = (s: string) => rows.filter((r) => r.profile.status === s).length;

    return {
      total: rows.length,
      active: byStatus('active'),
      watch: byStatus('watch'),
      dormant: byStatus('dormant'),
      churned: byStatus('churned'),
      // 今日 + 已逾期待跟进
      followDue: rows.filter((r) => r.followOverdueDays > 0 || r.followDueDays === 0).length,
      // 30 天内预计复购
      reorderSoon: rows.filter((r) => r.reorderInDays !== null && r.reorderInDays >= 0 && r.reorderInDays <= 30).length,
      // 30 天内协议到期
      agreementSoon: rows.filter((r) => r.agreementLeftDays !== null && r.agreementLeftDays >= 0 && r.agreementLeftDays <= 30).length,
      certSoon: sum((r) => r.certExpiringCount),
      highRisk: rows.filter((r) => r.churnRisk === 'high').length,
      complaint: rows.filter((r) => toNum(r.profile.complaintCount) > 0).length,
      totalOrderAmount: sum((r) => toNum(r.profile.totalOrderAmount)),
      reorderRate: rows.length
        ? Math.round((rows.filter((r) => toNum(r.profile.orderCount) >= 2).length / rows.length) * 100)
        : 0,
    };
  }

  /** 维护列表：默认按「逾期跟进优先、其次累计成交」排序 */
  list(query: any = {}) {
    const q = query || {};
    let rows = this.db.db.companies.map((c) => this.buildRow(c));
    const { status, risk, keyword, owner, level } = q;
    if (status) rows = rows.filter((r) => r.profile.status === status);
    if (risk) rows = rows.filter((r) => r.churnRisk === risk);
    if (owner) rows = rows.filter((r) => r.owner === owner);
    if (level) rows = rows.filter((r) => r.level === level);
    if (keyword) {
      const kw = String(keyword).toLowerCase();
      rows = rows.filter((r) =>
        `${r.companyName}${r.domain}${r.profile.mainProducts || ''}${r.profile.ourSkus || ''}`
          .toLowerCase()
          .includes(kw),
      );
    }
    // 排序：默认按新增日期降序；支持 等级/来源/下次跟进/最近联系
    const allowed = ['createdAt', 'level', 'source', 'followDueDays', 'lastContactDays'];
    const sortField = allowed.includes(q.sortBy) ? q.sortBy : 'createdAt';
    const dir = q.order === 'ascending' ? 1 : -1;
    rows.sort((a, b) => {
      const av = (a as any)[sortField];
      const bv = (b as any)[sortField];
      const aNull = av == null;
      const bNull = bv == null;
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      let cmp = 0;
      if (typeof av === 'string') cmp = String(av).localeCompare(String(bv));
      else cmp = av > bv ? 1 : av < bv ? -1 : 0;
      return cmp * dir;
    });
    // 分页
    const total = rows.length;
    const p = Math.max(1, Number(q.page) || 1);
    const s = Math.max(1, Number(q.size) || 20);
    const start = (p - 1) * s;
    return { total, rows: rows.slice(start, start + s) };
  }

  /** 单个客户的维护详情：档案 + 维护动态 + 系统联系人 + 指标 */
  /**
   * 客户历史轨迹：把系统里已有的邮件发送、客户回复、跟进活动、商机、询盘
   * 合并成一条倒序时间线，避免维护页只看得到手工新增的维护动态。
   */
  private buildHistory(companyId: string) {
    const rows: any[] = [];
    this.db.db.mailRecords.filter((m) => m.companyId === companyId).forEach((m) => {
      rows.push({ id: m.id, source: 'mail', status: m.status || '', title: m.subject || '', at: String(m.sentAt || ''), by: m.sender || '' });
    });
    this.db.db.mailReplies.filter((r) => r.companyId === companyId).forEach((r) => {
      rows.push({ id: r.id, source: 'reply', status: '', title: r.subject || '', desc: r.snippet || '', at: String(r.receivedAt || ''), by: r.fromName || r.fromEmail || '' });
    });
    this.db.db.activities.filter((a) => a.companyId === companyId).forEach((a) => {
      rows.push({ id: a.id, source: 'activity', status: a.type || '', title: a.content || '', at: String(a.createdAt || ''), by: a.operator || '' });
    });
    this.db.db.opportunities.filter((o) => o.companyId === companyId).forEach((o) => {
      rows.push({ id: o.id, source: 'opportunity', status: o.stage || '', title: o.title || '', amount: toNum(o.amount), at: String(o.createdAt || ''), by: o.source || '' });
    });
    this.db.db.inquiries.filter((i) => i.companyId === companyId).forEach((i) => {
      rows.push({ id: i.id, source: 'inquiry', status: i.status || '', title: i.content || '', at: String(i.createdAt || ''), by: i.assignee || '' });
    });
    return rows.filter((r) => r.at).sort((a, b) => b.at.localeCompare(a.at));
  }

  detail(companyId: string) {
    const company = this.db.db.companies.find((c) => c.id === companyId);
    if (!company) return null;
    const profile = this.ensureProfile(companyId);
    const logs = this.db.db.maintenanceLogs
      .filter((l) => l.companyId === companyId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const contacts = this.db.db.contacts.filter((c) => c.companyId === companyId);
    return {
      company,
      profile,
      logs,
      contacts,
      history: this.buildHistory(companyId),
      metrics: this.metrics(company, profile),
    };
  }

  /** 保存维护档案（整表覆盖式更新，字段以提交为准） */
  save(companyId: string, body: any) {
    const p = this.ensureProfile(companyId);
    // 关键标识字段不允许被提交内容覆盖
    const { id, createdAt, companyId: _ignored, ...rest } = body || {};
    Object.assign(p, rest, { companyId, updatedAt: new Date().toISOString() });
    this.db.save();
    return p;
  }

  /**
   * 新增维护动态，并自动回写档案关键指标：
   * 复购 → 累计金额 / 复购次数 / 上次成交；投诉 → 投诉次数；任意类型 → 最近联系日
   */
  addLog(body: any) {
    const log = {
      id: this.db.genId('ML'),
      companyId: body.companyId,
      type: body.type || 'follow',
      content: body.content,
      amount: toNum(body.amount),
      operator: body.operator || 'u1',
      nextDate: body.nextDate || '',
      createdAt: new Date().toISOString(),
    };
    this.db.db.maintenanceLogs.unshift(log);

    const p = this.ensureProfile(body.companyId);
    p.lastContactDate = todayStr();
    if (log.nextDate) p.nextFollowUpDate = log.nextDate;
    if (log.type === 'reorder' && log.amount > 0) {
      p.lastOrderDate = todayStr();
      p.lastOrderAmount = log.amount;
      p.totalOrderAmount = toNum(p.totalOrderAmount) + log.amount;
      p.orderCount = toNum(p.orderCount) + 1;
    }
    if (log.type === 'complaint') p.complaintCount = toNum(p.complaintCount) + 1;
    this.db.save();
    return log;
  }

  /**
   * 删除维护动态，并做「增量回退」而非全量重算：
   * 档案里的累计成交额可能包含系统外历史成交，全量按动态重算会抹掉这部分数据，
   * 因此只回退被删记录自身贡献的金额 / 次数，无剩余复购记录时才清空上次成交。
   */
  removeLog(id: string) {
    const idx = this.db.db.maintenanceLogs.findIndex((l) => l.id === id);
    if (idx < 0) return null;
    const [log] = this.db.db.maintenanceLogs.splice(idx, 1);

    const p = this.ensureProfile(log.companyId);
    if (log.type === 'reorder' && toNum(log.amount) > 0) {
      p.totalOrderAmount = Math.max(0, toNum(p.totalOrderAmount) - toNum(log.amount));
      p.orderCount = Math.max(0, toNum(p.orderCount) - 1);
      const rest = this.db.db.maintenanceLogs.filter(
        (l) => l.companyId === log.companyId && l.type === 'reorder' && toNum(l.amount) > 0,
      );
      if (rest.length) {
        const latest = [...rest].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
        p.lastOrderDate = todayStr(new Date(latest.createdAt));
        p.lastOrderAmount = toNum(latest.amount);
      } else {
        p.lastOrderDate = '';
        p.lastOrderAmount = 0;
      }
    }
    if (log.type === 'complaint') {
      p.complaintCount = Math.max(0, toNum(p.complaintCount) - 1);
    }
    this.db.save();
    return { ok: true };
  }
}

@Controller('maintenance')
export class MaintenanceController {
  constructor(private svc: MaintenanceService) {}

  /** 注意：静态路径必须声明在 :companyId 之前，否则会被动态路由吞掉 */
  @Get('overview')
  overview() {
    return this.svc.overview();
  }

  @Get('profiles')
  list(@Query() q: any) {
    return this.svc.list(q);
  }

  @Get(':companyId')
  detail(@Param('companyId') companyId: string) {
    return this.svc.detail(companyId);
  }

  @Put(':companyId')
  save(@Param('companyId') companyId: string, @Body() b: any) {
    return this.svc.save(companyId, b);
  }

  @Post('logs')
  addLog(@Body() b: any) {
    return this.svc.addLog(b);
  }

  @Delete('logs/:id')
  removeLog(@Param('id') id: string) {
    return this.svc.removeLog(id);
  }
}

@Module({
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
