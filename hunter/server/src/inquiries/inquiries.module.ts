import { Controller, Get, Post, Put, Delete, Body, Param, Query, Module, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

/** 询盘来源渠道：与数据看板「渠道贡献」共用同一套取值 */
const CHANNELS = ['seo', 'ads', 'platform', 'email', 'referral'];
const STATUSES = ['pending', 'processing', 'closed'];

/**
 * 询盘管理（模块 G 精简版）：
 * 核心是归因——每条询盘记录 sourceChannel / attributedKeyword / landingPage，
 * 数据看板的「渠道贡献」直接按 sourceChannel 统计，实现"独立站 → 询盘 → 看板"闭环。
 */
@Injectable()
class InquiriesService {
  constructor(private db: DbService) {}

  private rows(): any[] {
    return this.db.db.inquiries || [];
  }

  list(query: any = {}) {
    let rows = [...this.rows()];
    if (query.channel) rows = rows.filter((r: any) => r.sourceChannel === query.channel);
    if (query.status) rows = rows.filter((r: any) => r.status === query.status);
    if (query.keyword) {
      const kw = String(query.keyword).toLowerCase();
      rows = rows.filter((r: any) => String(r.attributedKeyword || '').toLowerCase().includes(kw));
    }
    return rows
      .map((r: any) => ({
        ...r,
        companyName: r.companyId
          ? this.db.db.companies.find((c: any) => c.id === r.companyId)?.name || null
          : null,
        overdue: r.status !== 'closed' && r.slaDeadline && r.slaDeadline < new Date().toISOString(),
      }))
      .sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  stats() {
    const rows = this.rows();
    const now = new Date().toISOString();
    const byChannel: Record<string, number> = {};
    CHANNELS.forEach((c) => { byChannel[c] = 0; });
    rows.forEach((r: any) => {
      const key = CHANNELS.includes(r.sourceChannel) ? r.sourceChannel : 'other';
      byChannel[key] = (byChannel[key] || 0) + 1;
    });
    return {
      total: rows.length,
      pending: rows.filter((r: any) => r.status === 'pending').length,
      processing: rows.filter((r: any) => r.status === 'processing').length,
      closed: rows.filter((r: any) => r.status === 'closed').length,
      overdue: rows.filter((r: any) => r.status !== 'closed' && r.slaDeadline && r.slaDeadline < now).length,
      attributed: rows.filter((r: any) => !!r.attributedKeyword).length,
      byChannel,
    };
  }

  create(body: any) {
    if (!body.content) return { ok: false, message: '询盘内容必填' };
    const row = {
      id: this.db.genId('I'),
      companyId: body.companyId || null,
      sourceChannel: CHANNELS.includes(body.sourceChannel) ? body.sourceChannel : 'seo',
      attributedKeyword: body.attributedKeyword || null,
      landingPage: body.landingPage || null,
      contactEmail: body.contactEmail || null,
      content: body.content,
      status: STATUSES.includes(body.status) ? body.status : 'pending',
      assignee: body.assignee || null,
      createdAt: new Date().toISOString(),
      slaDeadline: body.slaDeadline || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    };
    this.db.db.inquiries.unshift(row);
    this.db.save();
    return row;
  }

  update(id: string, body: any) {
    const row = this.rows().find((r: any) => r.id === id);
    if (!row) return { ok: false, message: '询盘不存在' };
    if (body.companyId !== undefined) row.companyId = body.companyId || null;
    if (body.sourceChannel && CHANNELS.includes(body.sourceChannel)) row.sourceChannel = body.sourceChannel;
    if (body.attributedKeyword !== undefined) row.attributedKeyword = body.attributedKeyword || null;
    if (body.landingPage !== undefined) row.landingPage = body.landingPage || null;
    if (body.contactEmail !== undefined) row.contactEmail = body.contactEmail || null;
    if (body.content !== undefined) row.content = body.content;
    if (body.status && STATUSES.includes(body.status)) row.status = body.status;
    if (body.assignee !== undefined) row.assignee = body.assignee || null;
    if (body.slaDeadline !== undefined) row.slaDeadline = body.slaDeadline;
    this.db.save();
    return row;
  }

  remove(id: string) {
    this.db.db.inquiries = this.rows().filter((r: any) => r.id !== id);
    this.db.save();
    return { ok: true };
  }
}

@Controller('inquiries')
export class InquiriesController {
  constructor(private svc: InquiriesService) {}

  @Get() list(@Query() q: any) { return this.svc.list(q); }
  @Get('stats') stats() { return this.svc.stats(); }
  @Post() create(@Body() b: any) { return this.svc.create(b); }
  @Put(':id') update(@Param('id') id: string, @Body() b: any) { return this.svc.update(id, b); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({
  controllers: [InquiriesController],
  providers: [InquiriesService],
})
export class InquiriesModule {}
