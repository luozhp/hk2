import { Controller, Get, Module, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

/** 本地日期 YYYY-MM-DD（避免 UTC 日界导致日期判断偏差） */
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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
        // 与数据看板 KPI 跟踪表同口径：线上询盘 + 线下询盘基数（设置页可配置，默认 12）
        inquiry2026: { target: 100, current: d.inquiries.length + this.offlineInquiries() },
        customer2028: { target: 20, current: d.companies.length },
      },
      mail: this.mailSummary(),
      tasks: d.tasks
        .filter((t) => t.status !== 'done')
        // 只按日期比较：dueDate 为当天 00:00，若与 now 比较会导致"今天到期"全天被判逾期
        .map((t) => {
          const due = String(t.dueDate || '').slice(0, 10);
          const today = todayKey();
          return { ...t, overdue: !!due && due < today };
        })
        .slice(0, 8),
    };
  }

  /** 线下询盘基数（可配置，默认 12），与 analytics.kpi() 保持同口径 */
  private offlineInquiries(): number {
    const settings: any = (this.db.db as any).settings || {};
    return Math.max(0, Number(settings.offlineInquiries ?? 12) || 0);
  }

  private mailSummary() {
    const d = this.db.db;
    const records = d.mailRecords;
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      // 用本地日期而非 UTC：否则 UTC+8 的凌晨会把近 7 天整体偏移一天
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
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
