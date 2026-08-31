import { Controller, Get, Module, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
class DashboardService {
  constructor(private db: DbService) {}

  overview() {
    const d = this.db.db;
    const openOpps = d.opportunities.filter((o) => !['won', 'lost'].includes(o.stage));
    const totalPipeline = openOpps.reduce((s, o) => s + (o.amount || 0), 0);
    return {
      stats: {
        leads: d.leads.length,
        pendingLeads: d.leads.filter((l) => l.status !== 'converted').length,
        customers: d.companies.length,
        inquiries: d.inquiries.length,
        opportunities: openOpps.length,
        pipelineAmount: totalPipeline,
        wonCustomers: d.opportunities.filter((o) => o.stage === 'won').length,
      },
      goals: {
        inquiry2026: { target: 100, current: d.inquiries.length + 12 },
        customer2028: { target: 20, current: d.companies.length },
      },
      mail: this.mailSummary(),
      tasks: d.tasks
        .filter((t) => t.status !== 'done')
        .map((t) => ({ ...t, overdue: new Date(t.dueDate) < new Date() }))
        .slice(0, 8),
    };
  }

  private mailSummary() {
    const d = this.db.db;
    const records = d.mailRecords;
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      const dayMails = records.filter((m) => m.sentAt.startsWith(key));
      week.push({ day: key.slice(5), sent: dayMails.length, replied: dayMails.filter((m) => m.status === 'replied').length });
    }
    const total = records.length;
    const replied = records.filter((r) => r.status === 'replied').length;
    return { week, replyRate: total ? Math.round((replied / total) * 1000) / 10 : 0 };
  }
}

@Controller('dashboard')
export class DashboardController {
  constructor(private svc: DashboardService) {}
  @Get('overview') overview() { return this.svc.overview(); }
}

@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
