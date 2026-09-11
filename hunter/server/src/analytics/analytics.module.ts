import { Controller, Get, Module, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
class AnalyticsService {
  constructor(private db: DbService) {}

  funnel() {
    const d = this.db.db;
    return {
      mail: {
        sent: d.mailRecords.length,
        delivered: d.mailRecords.filter((r) => ['opened', 'replied', 'delivered'].includes(r.status)).length,
        opened: d.mailRecords.filter((r) => ['opened', 'replied'].includes(r.status)).length,
        replied: d.mailRecords.filter((r) => r.status === 'replied').length,
        won: d.opportunities.filter((o) => o.stage === 'won').length,
      },
      conversion: {
        leads: d.leads.length,
        converted: d.leads.filter((l) => l.status === 'converted').length,
        customers: d.companies.length,
        inquiries: d.inquiries.length,
        opportunities: d.opportunities.length,
        won: d.opportunities.filter((o) => o.stage === 'won').length,
      },
    };
  }

  channels() {
    const d = this.db.db;
    const bySource = (rows: any[]) =>
      rows.reduce((acc: any, r: any) => {
        acc[r.source] = (acc[r.source] || 0) + 1;
        return acc;
      }, {});
    const leadCh = bySource(d.leads);
    const companyCh = d.companies.reduce((acc: any, c) => {
      const lead = d.leads.find((l) => l.id === c.leadId);
      const key = lead ? lead.source : 'manual';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return { leads: leadCh, companies: companyCh, inquiries: bySource(d.inquiries.map((i) => ({ ...i, source: i.sourceChannel }))) };
  }

  /** 首次触达时间：客户创建时间、关联线索创建时间、最早活动记录，取最早者 */
  private firstTouchAt(company: any): string | null {
    const times: string[] = [];
    if (company?.createdAt) times.push(company.createdAt);
    if (company?.leadId) {
      const lead = this.db.db.leads.find((l: any) => l.id === company.leadId);
      if (lead?.createdAt) times.push(lead.createdAt);
    }
    (this.db.db.activities || [])
      .filter((a: any) => a.companyId === company?.id && a.createdAt)
      .forEach((a: any) => times.push(a.createdAt));
    if (!times.length) return null;
    return times.sort()[0];
  }

  /** 当前生效的线下询盘基数（可配置，默认 12） */
  private offlineInquiries(): number {
    const settings: any = (this.db.db as any).settings || {};
    return Math.max(0, Number(settings.offlineInquiries ?? 12) || 0);
  }

  kpi() {
    const d = this.db.db;

    // —— 询盘量：系统内线上询盘 + 线下询盘基数（设置页可配置）——
    const offlineInquiries = this.offlineInquiries();
    const onlineInquiries = (d.inquiries || []).length;
    const inquiryTotal = onlineInquiries + offlineInquiries;

    // —— 询盘转化率：进入样品/报价及以后阶段的商机 ÷ 询盘总数 ——
    const ADVANCED = ['sample', 'quote', 'negotiation', 'won'];
    const advancedOpps = (d.opportunities || []).filter((o: any) => ADVANCED.includes(o.stage)).length;
    const conversionRate = inquiryTotal ? Math.round((advancedOpps / inquiryTotal) * 1000) / 10 : 0;

    // —— 成交周期：每个成交商机的（成交时间 − 首次触达）取均值，无样本时为 null ——
    const won = (d.opportunities || []).filter((o: any) => o.stage === 'won');
    let avgCycleDays: number | null = null;
    if (won.length) {
      const spans: number[] = [];
      won.forEach((o: any) => {
        const company = (d.companies || []).find((c: any) => c.id === o.companyId);
        const from = this.firstTouchAt(company);
        // 成交时间优先取阶段变为 won 时记录的 wonAt，无则回退商机创建时间
        const to = o.wonAt || o.createdAt;
        if (!from || !to) return;
        const days = (new Date(to).getTime() - new Date(from).getTime()) / 86400000;
        if (days >= 0) spans.push(days);
      });
      if (spans.length) {
        avgCycleDays = Math.round(spans.reduce((a, b) => a + b, 0) / spans.length);
      }
    }

    return {
      replyRate: d.mailRecords.length ? Math.round((d.mailRecords.filter((r) => r.status === 'replied').length / d.mailRecords.length) * 1000) / 10 : 0,
      industryBenchmark: '3% - 8%',
      avgCycleDays,
      cycleSampleSize: won.length,
      activeCustomers: d.companies.filter((c) => c.status === 'active').length,
      targetCustomers: 20,
      onlineInquiries,
      offlineInquiries,
      inquiryTotal,
      conversionRate,
      conversionAdvanced: advancedOpps,
    };
  }
}

@Controller('analytics')
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}
  @Get('funnel') funnel() { return this.svc.funnel(); }
  @Get('channels') channels() { return this.svc.channels(); }
  @Get('kpi') kpi() { return this.svc.kpi(); }
}

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
