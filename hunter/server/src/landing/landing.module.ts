import { Controller, Get, Post, Put, Delete, Body, Param, Module, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Roles } from '../auth/auth.guard';

/**
 * 落地页清单（F-E-03 精简版）：
 * 只维护"页面"这一层（路径、标题、意图、转化目标、上线状态、必备模块），
 * 承载的关键词数由 keywords.landingPage 反向统计，不重复存储，避免两边不一致。
 */
@Injectable()
class LandingService {
  constructor(private db: DbService) {}

  private siteUrl(): string {
    return (this.db.db as any)?.settings?.siteUrl || '';
  }

  private pages(): any[] {
    return this.db.db.landingPages || [];
  }

  list() {
    const kws: any[] = this.db.db.keywords || [];
    return this.pages().map((p: any) => {
      const owned = kws.filter((k: any) => k.landingPage === p.path);
      return {
        ...p,
        url: `${this.siteUrl()}${p.path}`,
        keywordCount: owned.length,
        headKeyword: owned.find((k: any) => k.category === 'head')?.keyword || null,
        trackedCount: owned.filter((k: any) => k.status === 'tracking').length,
      };
    });
  }

  add(body: any) {
    if (!body.path) return { ok: false, message: '页面路径必填' };
    if (this.pages().some((p: any) => p.path === body.path)) {
      return { ok: false, message: `页面 ${body.path} 已存在` };
    }
    const page = {
      id: this.db.genId('LP'),
      path: body.path,
      title: body.title || '',
      intent: body.intent || '',
      goal: body.goal || '',
      status: body.status || 'draft',
      modules: Array.isArray(body.modules) ? body.modules : [],
      owner: body.owner || null,
      updatedAt: new Date().toISOString(),
    };
    this.db.db.landingPages.unshift(page);
    this.db.save();
    return page;
  }

  update(id: string, body: any) {
    const page = this.pages().find((p: any) => p.id === id);
    if (!page) return { ok: false, message: '落地页不存在' };
    ['path', 'title', 'intent', 'goal', 'status', 'owner'].forEach((k) => {
      if (body[k] !== undefined) page[k] = body[k];
    });
    if (Array.isArray(body.modules)) page.modules = body.modules;
    page.updatedAt = new Date().toISOString();
    this.db.save();
    return page;
  }

  remove(id: string) {
    this.db.db.landingPages = this.pages().filter((p: any) => p.id !== id);
    this.db.save();
    return { ok: true };
  }
}

@Controller('landing-pages')
export class LandingController {
  constructor(private svc: LandingService) {}

  @Get() list() { return this.svc.list(); }
  // 落地页清单属运营配置：仅管理员 / 运营专员可写，业务员只读
  @Roles('admin', 'operator')
  @Post() add(@Body() b: any) { return this.svc.add(b); }
  @Roles('admin', 'operator')
  @Put(':id') update(@Param('id') id: string, @Body() b: any) { return this.svc.update(id, b); }
  @Roles('admin', 'operator')
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({
  controllers: [LandingController],
  providers: [LandingService],
})
export class LandingModule {}
