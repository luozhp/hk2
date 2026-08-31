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

  kpi() {
    const d = this.db.db;
    return {
      replyRate: d.mailRecords.length ? Math.round((d.mailRecords.filter((r) => r.status === 'replied').length / d.mailRecords.length) * 1000) / 10 : 0,
      industryBenchmark: '3% - 8%',
      avgCycleDays: 42,
      activeCustomers: d.companies.filter((c) => c.status === 'active').length,
      targetCustomers: 20,
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
