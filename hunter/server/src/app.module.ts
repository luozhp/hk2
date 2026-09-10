import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { LeadsModule } from './leads/leads.module';
import { DiscoverModule } from './discover/discover.module';
import { CompaniesModule } from './companies/companies.module';
import { MailModule } from './mail/mail.module';
import { ComplianceModule } from './compliance/compliance.module';
import { KeywordsModule } from './keywords/keywords.module';
import { LandingModule } from './landing/landing.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { SettingsModule } from './settings/settings.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CustomsModule } from './customs/customs.module';
import { DirectoryModule } from './directory/directory.module';
import { ExpoModule } from './expo/expo.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    DbModule,
    AuthModule,
    LeadsModule,
    DiscoverModule,
    CompaniesModule,
    MailModule,
    ComplianceModule,
    KeywordsModule,
    LandingModule,
    InquiriesModule,
    SettingsModule,
    AnalyticsModule,
    DashboardModule,
    CustomsModule,
    DirectoryModule,
    ExpoModule,
    MaintenanceModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
