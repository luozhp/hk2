import { Controller, Get, Post, Patch, Delete, Body, Param, Module, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
class KeywordsService {
  constructor(private db: DbService) {}

  keywords() { return this.db.db.keywords; }

  addKeyword(body: any) {
    const kw = {
      id: this.db.genId('K'), keyword: body.keyword, category: body.category || 'longtail',
      intent: body.intent || 'B', landingPage: body.landingPage || '/wholesale',
      rank: body.rank ?? null, status: body.status || 'pending',
    };
    this.db.db.keywords.unshift(kw);
    this.db.save();
    return kw;
  }

  removeKeyword(id: string) {
    this.db.db.keywords = this.db.db.keywords.filter((k) => k.id !== id);
    this.db.save();
    return { ok: true };
  }

  /** 局部更新：排名、收录状态、落地页归属、类型（排名跟踪 F-E-05 轻量版） */
  updateKeyword(id: string, body: any) {
    const kw = this.db.db.keywords.find((k) => k.id === id);
    if (!kw) return { ok: false, message: '关键词不存在' };
    if (body.keyword !== undefined && body.keyword) kw.keyword = body.keyword;
    if (body.category !== undefined && body.category) kw.category = body.category;
    if (body.landingPage !== undefined && body.landingPage) kw.landingPage = body.landingPage;
    if (body.status !== undefined && body.status) kw.status = body.status;
    if (body.rank !== undefined) {
      const raw = body.rank === '' || body.rank === null ? null : Number(body.rank);
      kw.rank = raw === null || Number.isNaN(raw) ? null : raw;
    }
    kw.updatedAt = new Date().toISOString();
    this.db.save();
    return kw;
  }

  negativeKeywords() { return this.db.db.negativeKeywords; }

  addNegative(body: any) {
    const nk = { id: this.db.genId('N'), keyword: body.keyword, channel: body.channel || 'google-ads', note: body.note || '' };
    this.db.db.negativeKeywords.unshift(nk);
    this.db.save();
    return nk;
  }

  removeNegative(id: string) {
    this.db.db.negativeKeywords = this.db.db.negativeKeywords.filter((k) => k.id !== id);
    this.db.save();
    return { ok: true };
  }
}

@Controller('keywords')
export class KeywordsController {
  constructor(private svc: KeywordsService) {}
  @Get() keywords() { return this.svc.keywords(); }
  @Post() addKeyword(@Body() b: any) { return this.svc.addKeyword(b); }
  @Delete(':id') removeKeyword(@Param('id') id: string) { return this.svc.removeKeyword(id); }
  @Patch(':id') updateKeyword(@Param('id') id: string, @Body() b: any) { return this.svc.updateKeyword(id, b); }
  @Get('negative') negativeKeywords() { return this.svc.negativeKeywords(); }
  @Post('negative') addNegative(@Body() b: any) { return this.svc.addNegative(b); }
  @Delete('negative/:id') removeNegative(@Param('id') id: string) { return this.svc.removeNegative(id); }
}

@Module({
  controllers: [KeywordsController],
  providers: [KeywordsService],
})
export class KeywordsModule {}
