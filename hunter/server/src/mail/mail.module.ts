import { Controller, Get, Post, Query, Body, Module, Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { DbService } from '../db/db.service';

const DAILY_SEND_LIMIT = 50;

// 真实邮件通道配置（通过 .env 注入，未配置时回退 mock）
const MAIL_PROVIDER = (process.env.MAIL_PROVIDER || 'mock').toLowerCase(); // mock | smtp | ses
const MAIL_FROM = process.env.MAIL_FROM || 'sales@smileiceqi.com';
const MAIL_SMTP_HOST = process.env.MAIL_SMTP_HOST || '';
const MAIL_SMTP_PORT = Number(process.env.MAIL_SMTP_PORT || '587');
const MAIL_SMTP_USER = process.env.MAIL_SMTP_USER || '';
const MAIL_SMTP_PASS = process.env.MAIL_SMTP_PASS || '';

@Injectable()
class MailService {
  constructor(private db: DbService) {}

  provider() { return MAIL_PROVIDER; }

  templates() {
    return this.db.db.mailTemplates;
  }

  records(query: any) {
    let rows = [...this.db.db.mailRecords];
    if (query.status) rows = rows.filter((r) => r.status === query.status);
    return rows.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  }

  stats() {
    const rows = this.db.db.mailRecords;
    const total = rows.length;
    const opened = rows.filter((r) => r.status === 'opened' || r.status === 'replied').length;
    const replied = rows.filter((r) => r.status === 'replied').length;
    const sentToday = rows.filter((r) => r.sentAt.startsWith(new Date().toISOString().slice(0, 10))).length;
    return {
      total, opened, replied,
      delivered: rows.filter((r) => ['opened', 'replied', 'delivered'].includes(r.status)).length,
      openRate: total ? Math.round((opened / total) * 1000) / 10 : 0,
      replyRate: total ? Math.round((replied / total) * 1000) / 10 : 0,
      remainingToday: Math.max(0, DAILY_SEND_LIMIT - sentToday),
      dailyLimit: DAILY_SEND_LIMIT,
    };
  }

  preview(body: any) {
    const template = this.db.db.mailTemplates.find((t) => t.id === body.templateId);
    if (!template) return { ok: false, message: '模板不存在' };
    const ctx = {
      contactName: body.contactName || 'John',
      senderName: 'Sales Team',
      senderCompany: 'Smile Ice Qi Co., Ltd.',
      msdsLink: 'https://smileiceqi.com/docs/msds',
      websiteLink: 'https://smileiceqi.com',
    };
    const subject = template.subject.replace(/\{\{(\w+)\}\}/g, (_, k) => ctx[k] ?? '');
    const emailBody = template.body.replace(/\{\{(\w+)\}\}/g, (_, k) => ctx[k] ?? '');
    return { ok: true, subject, body: emailBody, templateName: template.name };
  }

  checkCompliance(body: any) {
    const forbidden = this.db.db.forbiddenWords.filter((f) => f.isActive);
    const combined = `${body.subject || ''}\n${body.body || ''}`.toLowerCase();
    const hits = forbidden.filter((f) => combined.includes(f.word.toLowerCase()));
    const docs = this.db.db.complianceDocs.filter((d) => d.status === 'valid').map((d) => d.publicLink);
    return {
      ok: hits.length === 0,
      hits,
      requiredDocs: docs,
      attachDocs: hits.length === 0 ? docs : [],
      message: hits.length ? `检测到违禁词：${hits.map((h) => h.word).join('、')}` : '合规检查通过',
    };
  }

  async send(body: any) {
    const check = this.checkCompliance(body);
    if (!check.ok) {
      return { ok: false, message: `发送已拦截：${check.message}`, blocked: true, hits: check.hits };
    }
    const stats = this.stats();
    if (stats.remainingToday <= 0) {
      return { ok: false, message: '今日发送配额已达上限（50 封），请明日再发或更换账号', blocked: true };
    }
    const recipients = Array.isArray(body.recipients) ? body.recipients : [body];
    const subject = body.subject || 'Food-grade N2O Cream Charger Wholesale';
    const text = body.body || '';
    const attaches = (check.attachDocs || []).map((link: string) => ({ filename: link.split('/').pop() || 'doc', path: link }));
    const created = recipients.map((r: any) => ({
      id: this.db.genId('M'),
      templateId: body.templateId || 'T001',
      companyId: r.companyId || null,
      contactId: r.contactId || null,
      to: r.email || r.to || '',
      subject,
      status: 'sent',
      sentAt: new Date().toISOString(),
      openedAt: null,
      repliedAt: null,
      sender: body.sender || 'u1',
    }));

    // 真实通道投递（mock 仅落库，不实际发送）
    let delivered = 0;
    if (MAIL_PROVIDER !== 'mock') {
      const transporter = nodemailer.createTransport({
        host: MAIL_SMTP_HOST, port: MAIL_SMTP_PORT, secure: MAIL_SMTP_PORT === 465,
        auth: { user: MAIL_SMTP_USER, pass: MAIL_SMTP_PASS },
      });
      for (const m of created) {
        if (!m.to) continue;
        try {
          await transporter.sendMail({ from: MAIL_FROM, to: m.to, subject, text, attachments: attaches });
          m.status = 'delivered';
          delivered++;
        } catch (e: any) {
          m.status = 'failed';
          m.error = e?.message || 'send failed';
        }
      }
    } else {
      delivered = created.length; // mock 视为全部可投递
    }

    this.db.db.mailRecords.unshift(...created);
    created.forEach((m: any) => {
      if (m.companyId) {
        this.db.db.activities.unshift({
          id: this.db.genId('A'), companyId: m.companyId, contactId: m.contactId,
          type: 'email', content: `发送开发信（${created.length > 1 ? '批量' : ''}）：${m.subject}`,
          operator: m.sender, createdAt: m.sentAt,
        });
      }
    });
    this.db.save();
    if (MAIL_PROVIDER !== 'mock') {
      return { ok: true, sent: created.length, delivered, message: `真实投递完成：${delivered}/${created.length} 封已送达，失败 ${created.length - delivered} 封` };
    }
    return { ok: true, sent: created.length, message: `已加入发送队列（${created.length} 封），模拟发送成功` };
  }

  // 投递状态回写（真实邮件服务商 webhook 或手动演示用）
  webhook(body: any) {
    const rec = this.db.db.mailRecords.find((r) => r.id === body.id);
    if (!rec) return { ok: false, message: '记录不存在' };
    const evt = body.event; // opened | replied | failed
    if (evt === 'opened') { rec.status = 'opened'; rec.openedAt = new Date().toISOString(); }
    else if (evt === 'replied') { rec.status = 'replied'; rec.repliedAt = new Date().toISOString(); }
    else if (evt === 'failed') { rec.status = 'failed'; rec.error = body.reason || 'bounce'; }
    this.db.save();
    return { ok: true, message: `状态已回写为 ${rec.status}` };
  }
}

@Controller('mail')
export class MailController {
  constructor(private svc: MailService) {}
  @Get('templates') templates() { return this.svc.templates(); }
  @Get('records') records(@Query() q: any) { return this.svc.records(q); }
  @Get('stats') stats() { return this.svc.stats(); }
  @Post('preview') preview(@Body() b: any) { return this.svc.preview(b); }
  @Post('check') check(@Body() b: any) { return this.svc.checkCompliance(b); }
  @Post('send') send(@Body() b: any) { return this.svc.send(b); }
  @Get('provider') provider() { return { provider: this.svc.provider() }; }
  @Post('webhook') webhook(@Body() b: any) { return this.svc.webhook(b); }
}

@Module({
  controllers: [MailController],
  providers: [MailService],
})
export class MailModule {}
