import { Controller, Get, Post, Put, Delete, Body, Param, Module, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Roles } from '../auth/auth.guard';

@Injectable()
class ComplianceService {
  constructor(private db: DbService) {}

  /** 合规检查清单：持久化在 db.complianceChecks（早期版本存于模块内存，重启即丢失） */
  private checks(): any[] {
    return this.db.db.complianceChecks || [];
  }

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
    // 字段白名单：防止客户端篡改 id / createdAt 等标识字段
    if (body.docType !== undefined) doc.docType = body.docType;
    if (body.name !== undefined) doc.name = body.name;
    if (body.version !== undefined) doc.version = body.version;
    if (body.expireDate !== undefined) doc.expireDate = body.expireDate;
    // publicLink 安全校验：仅允许站内相对路径或 http(s) 链接，
    // 禁止盘符/绝对路径/上级目录，避免邮件把它当附件路径造成服务器文件外泄
    if (body.publicLink !== undefined) {
      const link = String(body.publicLink).trim();
      const safe = /^(https?:\/\/|\/)/.test(link) && !link.includes('..') && !/^[a-zA-Z]:/.test(link);
      if (safe) doc.publicLink = link;
    }
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
    const rows = this.checks();
    return rows.map((c) => ({ ...c, progress: rows.filter((x) => x.done).length }));
  }

  toggleCheck(body: any) {
    const item = this.checks().find((c: any) => c.key === body.key);
    if (!item) return this.checklist();
    item.done = body.done ?? !item.done;
    item.updatedAt = new Date().toISOString();
    this.db.save();
    return this.checklist();
  }
}

@Controller('compliance')
export class ComplianceController {
  constructor(private svc: ComplianceService) {}
  @Get('docs') docs() { return this.svc.docs(); }
  // 合规文档与禁词库属运营配置：仅管理员 / 运营专员可写，业务员只读
  @Roles('admin', 'operator')
  @Post('docs') addDoc(@Body() b: any) { return this.svc.addDoc(b); }
  @Roles('admin', 'operator')
  @Put('docs/:id') updateDoc(@Param('id') id: string, @Body() b: any) { return this.svc.updateDoc(id, b); }
  @Roles('admin', 'operator')
  @Delete('docs/:id') removeDoc(@Param('id') id: string) { return this.svc.removeDoc(id); }
  @Get('forbidden-words') forbiddenWords() { return this.svc.forbiddenWords(); }
  @Roles('admin', 'operator')
  @Post('forbidden-words') addForbiddenWord(@Body() b: any) { return this.svc.addForbiddenWord(b); }
  @Roles('admin', 'operator')
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
