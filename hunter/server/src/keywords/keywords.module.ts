import { Controller, Get, Post, Delete, Body, Param, Module, Injectable } from '@nestjs/common';
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
  @Get('negative') negativeKeywords() { return this.svc.negativeKeywords(); }
  @Post('negative') addNegative(@Body() b: any) { return this.svc.addNegative(b); }
  @Delete('negative/:id') removeNegative(@Param('id') id: string) { return this.svc.removeNegative(id); }
}

@Module({
  controllers: [KeywordsController],
  providers: [KeywordsService],
})
export class KeywordsModule {}
