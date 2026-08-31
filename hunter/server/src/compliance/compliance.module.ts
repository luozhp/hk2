import { Controller, Get, Post, Put, Delete, Body, Param, Module, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

const CHECKLIST = [
  { key: 'factory', label: '工厂介绍页（实拍/产能/年限）', module: '独立站', done: true },
  { key: 'cert', label: 'MSDS、UN/DOT 证书展示', module: '独立站', done: true },
  { key: 'oem', label: 'OEM/ODM 说明页', module: '独立站', done: false },
  { key: 'moq', label: 'MOQ 与批量报价入口', module: '独立站', done: false },
  { key: 'email', label: '邮件均附 MSDS 与 UN-DOT 链接', module: '邮件', done: true },
  { key: 'ads', label: '广告否定词已配置（whip charger/gas）', module: '广告', done: false },
  { key: 'copy', label: '全渠道文案使用 culinary/foodservice 口径', module: '内容', done: true },
];

@Injectable()
class ComplianceService {
  constructor(private db: DbService) {}

  docs() { return this.db.db.complianceDocs; }

  addDoc(body: any) {
    const doc = {
      id: this.db.genId('D'), docType: body.docType, name: body.name,
      file: body.file || null, publicLink: body.publicLink || '/docs/' + body.docType,
      version: body.version || 'v1.0', expireDate: body.expireDate || '2027-12-31',
      status: 'valid', createdAt: new Date().toISOString(),
    };
    this.db.db.complianceDocs.unshift(doc);
    this.db.save();
    return doc;
  }

  updateDoc(id: string, body: any) {
    const doc = this.db.db.complianceDocs.find((d) => d.id === id);
    if (!doc) return null;
    Object.assign(doc, body);
    this.db.save();
    return doc;
  }

  removeDoc(id: string) {
    this.db.db.complianceDocs = this.db.db.complianceDocs.filter((d) => d.id !== id);
    this.db.save();
    return { ok: true };
  }

  forbiddenWords() { return this.db.db.forbiddenWords; }

  addForbiddenWord(body: any) {
    const word = { id: this.db.genId('F'), word: body.word, replacement: body.replacement || '—', isActive: true };
    this.db.db.forbiddenWords.unshift(word);
    this.db.save();
    return word;
  }

  removeForbiddenWord(id: string) {
    this.db.db.forbiddenWords = this.db.db.forbiddenWords.filter((f) => f.id !== id);
    this.db.save();
    return { ok: true };
  }

  scan(body: any) {
    const forbidden = this.db.db.forbiddenWords.filter((f) => f.isActive);
    const text = (body.text || '').toLowerCase();
    const hits = forbidden.filter((f) => text.includes(f.word.toLowerCase()));
    return { ok: hits.length === 0, hits, suggestions: hits.map((h) => ({ word: h.word, replacement: h.replacement })) };
  }

  checklist() {
    return CHECKLIST.map((c) => ({ ...c, progress: CHECKLIST.filter((x) => x.done).length }));
  }

  toggleCheck(body: any) {
    const item = CHECKLIST.find((c) => c.key === body.key);
    if (item) item.done = body.done ?? !item.done;
    return this.checklist();
  }
}

@Controller('compliance')
export class ComplianceController {
  constructor(private svc: ComplianceService) {}
  @Get('docs') docs() { return this.svc.docs(); }
  @Post('docs') addDoc(@Body() b: any) { return this.svc.addDoc(b); }
  @Put('docs/:id') updateDoc(@Param('id') id: string, @Body() b: any) { return this.svc.updateDoc(id, b); }
  @Delete('docs/:id') removeDoc(@Param('id') id: string) { return this.svc.removeDoc(id); }
  @Get('forbidden-words') forbiddenWords() { return this.svc.forbiddenWords(); }
  @Post('forbidden-words') addForbiddenWord(@Body() b: any) { return this.svc.addForbiddenWord(b); }
  @Delete('forbidden-words/:id') removeForbiddenWord(@Param('id') id: string) { return this.svc.removeForbiddenWord(id); }
  @Post('scan') scan(@Body() b: any) { return this.svc.scan(b); }
  @Get('checklist') checklist() { return this.svc.checklist(); }
  @Post('checklist') toggleCheck(@Body() b: any) { return this.svc.toggleCheck(b); }
}

@Module({
  controllers: [ComplianceController],
  providers: [ComplianceService],
})
export class ComplianceModule {}
