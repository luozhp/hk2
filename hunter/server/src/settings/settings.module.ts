import { Controller, Get, Put, Body, Module, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

/** 允许前端直接修改的配置项白名单 */
const ALLOWED = ['siteUrl', 'brandName', 'offlineInquiries'];

/**
 * 系统配置：独立站域名等。
 * 之前域名硬编码在邮件模板与前端，换站需要改代码；改由配置驱动后，
 * 邮件模板变量 {{websiteLink}} 与落地页 URL 均从此处读取。
 */
@Injectable()
class SettingsService {
  constructor(private db: DbService) {}

  get() {
    return { ...((this.db.db as any).settings || {}) };
  }

  update(body: any) {
    const settings: any = (this.db.db as any).settings || {};
    ALLOWED.forEach((k) => {
      if (body[k] !== undefined) settings[k] = String(body[k]).trim();
    });
    (this.db.db as any).settings = settings;
    this.db.save();
    return { ...settings };
  }
}

@Controller('settings')
export class SettingsController {
  constructor(private svc: SettingsService) {}

  @Get() get() { return this.svc.get(); }
  @Put() update(@Body() b: any) { return this.svc.update(b); }
}

@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
