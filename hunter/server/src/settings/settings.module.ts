import { Controller, Get, Put, Body, Module, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DbService } from '../db/db.service';
import { Roles, CurrentUser } from '../auth/auth.guard';

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

  /** 站点密钥：首次读取时自动生成，供独立站表单回传询盘的公开接口校验 */
  private ensureSiteKey(): string {
    const settings: any = (this.db.db as any).settings || {};
    if (!settings.siteKey) {
      settings.siteKey = 'sk_' + randomBytes(16).toString('hex');
      (this.db.db as any).settings = settings;
      this.db.save();
    }
    return settings.siteKey;
  }

  get() {
    this.ensureSiteKey();
    return { ...((this.db.db as any).settings || {}) };
  }

  update(body: any) {
    const settings: any = (this.db.db as any).settings || {};
    ALLOWED.forEach((k) => {
      if (body[k] !== undefined) settings[k] = String(body[k]).trim();
    });
    // 站点密钥单独处理：仅接受非空值（重置时可自定义）
    if (body.siteKey !== undefined && String(body.siteKey).trim()) {
      settings.siteKey = String(body.siteKey).trim();
    }
    (this.db.db as any).settings = settings;
    this.db.save();
    return { ...settings };
  }
}

@Controller('settings')
export class SettingsController {
  constructor(private svc: SettingsService) {}

  /** 站点密钥仅管理员可见：避免普通用户拿到 siteKey 后向公开询盘接口灌数据 */
  @Get()
  get(@CurrentUser() user: any) {
    const s = this.svc.get();
    if (user?.role !== 'admin') {
      const { siteKey, ...rest } = s as any;
      return rest;
    }
    return s;
  }

  @Roles('admin')
  @Put()
  update(@Body() b: any) {
    return this.svc.update(b);
  }
}

@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
