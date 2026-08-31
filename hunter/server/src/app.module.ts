import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { LeadsModule } from './leads/leads.module';
import { DiscoverModule } from './discover/discover.module';
import { CompaniesModule } from './companies/companies.module';
import { MailModule } from './mail/mail.module';
import { ComplianceModule } from './compliance/compliance.module';
import { KeywordsModule } from './keywords/keywords.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    DbModule,
    LeadsModule,
    DiscoverModule,
    CompaniesModule,
    MailModule,
    ComplianceModule,
    KeywordsModule,
    AnalyticsModule,
    DashboardModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
