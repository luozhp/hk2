import { Controller, Get, Post, Query, Body, Param, Module, Injectable, Res } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { DbService } from '../db/db.service';
import { Public } from '../auth/auth.guard';

const DAILY_SEND_LIMIT = 50;

// 打开追踪像素的公网地址（形如 https://your-server.com），留空则不启用打开追踪
const MAIL_TRACK_BASE_URL = (process.env.MAIL_TRACK_BASE_URL || '').replace(/\/+$/, '');

// 1x1 透明 GIF（打开追踪像素）
const TRACK_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

// 真实邮件通道配置（通过 .env 注入，未配置时回退 mock）
const MAIL_PROVIDER = (process.env.MAIL_PROVIDER || 'mock').toLowerCase(); // mock | smtp | ses
const MAIL_FROM = process.env.MAIL_FROM || 'sales@smileiceqi.com';
const MAIL_SMTP_HOST = process.env.MAIL_SMTP_HOST || '';
const MAIL_SMTP_PORT = Number(process.env.MAIL_SMTP_PORT || '587');
const MAIL_SMTP_USER = process.env.MAIL_SMTP_USER || '';
const MAIL_SMTP_PASS = process.env.MAIL_SMTP_PASS || '';
// IMAP 收信配置（未配置时使用模拟回信演示）
const MAIL_IMAP_HOST = process.env.MAIL_IMAP_HOST || '';
const MAIL_IMAP_PORT = Number(process.env.MAIL_IMAP_PORT || '993');
const MAIL_IMAP_USER = process.env.MAIL_IMAP_USER || '';
const MAIL_IMAP_PASS = process.env.MAIL_IMAP_PASS || '';
const MAIL_IMAP_SSL = (process.env.MAIL_IMAP_SSL || 'true') !== 'false';

@Injectable()
class MailService {
  constructor(private db: DbService) {}

  /** 独立站域名来自系统配置（settings.siteUrl），换站无需改代码 */
  private siteUrl(): string {
    return (this.db.db as any)?.settings?.siteUrl || 'https://smileiceqi.com';
  }

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
      msdsLink: `${this.siteUrl()}/docs/msds`,
      websiteLink: this.siteUrl(),
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
    // 真实通道但未配置凭证：给出友好提示，不崩溃
    if (MAIL_PROVIDER !== 'mock' && (!MAIL_SMTP_HOST || !MAIL_SMTP_USER || !MAIL_SMTP_PASS)) {
      return {
        ok: false, blocked: true,
        message: `已启用真实发送模式（MAIL_PROVIDER=${MAIL_PROVIDER}），但未配置 SMTP 凭证（MAIL_SMTP_HOST/USER/PASS）。请在 server/.env 填写后重启，或将 MAIL_PROVIDER 改为 mock 使用模拟发送。`,
      };
    }

    const recipients = Array.isArray(body.recipients) ? body.recipients : [body];
    const template = body.templateId ? this.db.db.mailTemplates.find((t) => t.id === body.templateId) : null;

    // 按收件人生成个性化称呼（优先收件人联系人姓名，其次匹配邮箱的联系人，最后取公司首个联系人）
    const resolveFirstName = (r: any): string | null => {
      if (r.contactName) return String(r.contactName).trim().split(/\s+/)[0];
      const contacts = this.db.db.contacts.filter((c) => c.companyId === r.companyId);
      const matched = contacts.find(
        (c) => c.email && r.email && c.email.toLowerCase() === r.email.toLowerCase(),
      ) || contacts[0];
      if (!matched?.name) return null;
      return String(matched.name).trim().split(/\s+/)[0];
    };
    const resolveCompanyName = (r: any): string =>
      this.db.db.companies.find((c) => c.id === r.companyId)?.name || '';

    // 模板变量逐收件人渲染（{{contactName}} / {{companyName}} / {{senderName}} 等）
    const renderFor = (r: any, subjectSource: string, bodySource: string) => {
      const ctx: Record<string, string> = {
        contactName: resolveFirstName(r) || 'Sir or Madam',
        companyName: resolveCompanyName(r) || 'your company',
        senderName: 'Sales Team',
        senderCompany: 'Smile Ice Qi Co., Ltd.',
        msdsLink: `${this.siteUrl()}/docs/msds`,
        websiteLink: this.siteUrl(),
      };
      const subj = subjectSource.replace(/\{\{(\w+)\}\}/g, (_, k) => ctx[k] ?? '');
      const text = bodySource.replace(/\{\{(\w+)\}\}/g, (_, k) => ctx[k] ?? '');
      return { subj, text };
    };

    const attaches = (check.attachDocs || []).map((link: string) => ({ filename: link.split('/').pop() || 'doc', path: link }));
    const created = recipients.map((r: any) => {
      const rendered = template
        ? renderFor(r, template.subject, template.body)
        : { subj: body.subject || 'Food-grade N2O Cream Charger Wholesale', text: body.body || '' };
      return {
        id: this.db.genId('M'),
        templateId: body.templateId || 'T001',
        companyId: r.companyId || null,
        contactId: r.contactId || null,
        to: r.email || r.to || '',
        subject: rendered.subj,
        text: rendered.text,
        status: 'sent',
        sentAt: new Date().toISOString(),
        openedAt: null,
        repliedAt: null,
        sender: body.sender || 'u1',
      };
    });

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
          const mail: any = { from: MAIL_FROM, to: m.to, subject: m.subject, text: m.text, attachments: attaches };
          // 打开追踪：配置了公网地址时，额外附加 HTML 版本并在末尾埋入 1x1 追踪像素
          if (MAIL_TRACK_BASE_URL) {
            mail.html = `${this.textToHtml(m.text)}<img src="${MAIL_TRACK_BASE_URL}/api/mail/track/${m.id}" width="1" height="1" alt="" />`;
          }
          await transporter.sendMail(mail);
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

  /** 纯文本正文 → 简单 HTML（供嵌入追踪像素） */
  private textToHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
      .join('');
  }

  /** 打开追踪：收件人加载邮件内像素时回写「已打开」（每封只记一次） */
  trackOpen(id: string): boolean {
    const rec = this.db.db.mailRecords.find((r) => r.id === id);
    if (!rec) return false;
    if (rec.status === 'opened' || rec.status === 'replied') return false;
    rec.status = 'opened';
    rec.openedAt = new Date().toISOString();
    this.db.save();
    return true;
  }

  // ---------- 客户回信（IMAP 收信） ----------

  replies(query: any) {
    const rows = [...this.db.db.mailReplies];
    const list = rows.map((r) => {
      const company = this.db.db.companies.find((c) => c.id === r.companyId);
      return { ...r, companyName: company?.name || r.fromName || '未知客户' };
    });
    if (query.companyId) return list.filter((r) => r.companyId === query.companyId);
    return list.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  }

  unreadCount() {
    return this.db.db.mailReplies.filter((r) => !r.isRead).length;
  }

  markRead(id: string) {
    const rec = this.db.db.mailReplies.find((r) => r.id === id);
    if (!rec) return { ok: false, message: '回信不存在' };
    rec.isRead = true;
    this.db.save();
    return { ok: true };
  }

  /** 按发件邮箱匹配客户 */
  private resolveCompanyId(fromEmail: string): string | null {
    const e = (fromEmail || '').toLowerCase();
    if (!e) return null;
    const contact = this.db.db.contacts.find((c) => c.email && c.email.toLowerCase() === e);
    if (contact) return contact.companyId;
    const company = this.db.db.companies.find((c) => c.email && c.email.toLowerCase() === e);
    return company?.id || null;
  }

  /** HTML → 纯文本 */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /** 去掉引用区（> 开头的原文行），只保留客户新增内容 */
  private stripQuoted(text: string): string {
    return text
      .split('\n')
      .filter((l) => !l.trim().startsWith('>') && !/^[-_]{3,}/.test(l.trim()))
      .join('\n')
      .trim();
  }

  /** 真实 IMAP 拉取收件箱 */
  private async fetchFromImap(): Promise<any[]> {
    const client = new ImapFlow({
      host: MAIL_IMAP_HOST,
      port: MAIL_IMAP_PORT,
      secure: MAIL_IMAP_SSL,
      auth: { user: MAIL_IMAP_USER, pass: MAIL_IMAP_PASS },
      logger: false,
    });
    await client.connect();
    const results: any[] = [];
    try {
      const lock = await client.getMailboxLock('INBOX');
      try {
        for await (const msg of client.fetch('1:*', { envelope: true, source: true })) {
          const from = msg.envelope?.from?.[0];
          if (!from?.address) continue;
          // 跳过自己发送的（系统发件箱本身也可能在收件箱出现）
          if (from.address.toLowerCase() === MAIL_FROM.toLowerCase()) continue;
          const parsed = await simpleParser(msg.source || Buffer.from(''));
          const body = (parsed.text || this.htmlToText(parsed.html || '')).trim();
          if (!body) continue;
          const messageId =
            msg.envelope.messageId || `${from.address}_${parsed.date?.getTime() || Date.now()}_${msg.uid}`;
          results.push({
            id: this.db.genId('R'),
            companyId: this.resolveCompanyId(from.address),
            contactId: null,
            fromEmail: from.address,
            fromName: from.name || from.address,
            toEmail: MAIL_FROM,
            subject: parsed.subject || '(无主题)',
            snippet: this.stripQuoted(body).slice(0, 120),
            body: this.stripQuoted(body),
            messageId,
            isRead: false,
            source: 'imap',
            receivedAt: (parsed.date || new Date()).toISOString(),
          });
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
    return results;
  }

  /** 未配置 IMAP 时生成一条模拟回信（演示用） */
  private mockSync(): { ok: boolean; fetched: number; created: number; message: string; mock: boolean } {
    const candidates = [
      {
        companyId: 'C001', fromEmail: 'import@bakerysupply.net', fromName: 'Robert Miller',
        subject: 'Re: Food-grade N2O Cream Charger Wholesale | OEM/ODM Factory',
        body: 'Hi Sales Team,\n\nWe received your MSDS documents, thanks. Please share the MOQ for 50-piece packaging and the bulk price for 2 containers. Also confirm the UN-DOT paperwork is included in the price.\n\nBest,\nRobert Miller\nBakerySupply',
      },
      {
        companyId: 'C002', fromEmail: 'purchasing@sunrisefoodservice.com', fromName: 'Purchasing Team',
        subject: 'Re: Food-grade N2O Cream Charger Wholesale | OEM/ODM Factory',
        body: 'Hello,\n\nWe are interested in your samples. Could you arrange a sample shipment to our Seattle warehouse and let us know the lead time for a first container?\n\nRegards,\nPurchasing Team\nSunrise Foodservice',
      },
      {
        companyId: 'C004', fromEmail: 'oem@clouddessertbrands.com', fromName: 'Michelle Nguyen',
        subject: 'Re: OEM/ODM Cream Whipper Manufacturer Partner',
        body: 'Hello,\n\nThanks for the OEM catalog. We need the cream whipper in 3 sizes with our branding. What is your MOQ for private label and the tooling cost?\n\nThanks,\nMichelle Nguyen\nCloudDessert Brands',
      },
    ];
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const pendingDup = this.db.db.mailReplies.some((r) => r.fromEmail === pick.fromEmail && !r.isRead);
    if (pendingDup) {
      return { ok: true, fetched: 0, created: 0, message: `暂无新回信（累计 ${this.db.db.mailReplies.length} 封）`, mock: true };
    }
    this.db.db.mailReplies.unshift({
      id: this.db.genId('R'),
      companyId: pick.companyId,
      contactId: null,
      fromEmail: pick.fromEmail,
      fromName: pick.fromName,
      toEmail: MAIL_FROM,
      subject: pick.subject,
      snippet: pick.body.slice(0, 120),
      body: pick.body,
      messageId: `${pick.fromEmail}_${Date.now()}`,
      isRead: false,
      source: 'mock',
      receivedAt: new Date().toISOString(),
    });
    this.db.save();
    return { ok: true, fetched: 1, created: 1, message: `模拟收到 1 封新回信（来自 ${pick.fromName}）`, mock: true };
  }

  /** 同步收件箱：IMAP 拉取（未配置时模拟演示），并回写发送记录状态 */
  async syncInbox() {
    const fetched: any =
      MAIL_IMAP_HOST && MAIL_IMAP_USER && MAIL_IMAP_PASS
        ? await this.fetchFromImap()
        : this.mockSync();
    if (fetched.mock) return fetched;

    let created = 0;
    const existing = new Set(this.db.db.mailReplies.map((r) => r.messageId));
    const fresh: any[] = [];
    for (const raw of fetched) {
      if (existing.has(raw.messageId)) continue;
      existing.add(raw.messageId);
      fresh.push(raw);
    }
    if (fresh.length) {
      this.db.db.mailReplies.unshift(...fresh);
      // 回写对应发送记录为「已回复」
      fresh.forEach((r) => {
        const rec = this.db.db.mailRecords.find(
          (m) => m.to && m.to.toLowerCase() === r.fromEmail.toLowerCase() && m.status !== 'replied',
        );
        if (rec) { rec.status = 'replied'; rec.repliedAt = r.receivedAt; }
      });
      this.db.save();
      created = fresh.length;
    }
    return {
      ok: true, fetched: fetched.length, created,
      message: created ? `已拉取 ${created} 封新回信` : '没有新回信',
      imap: true,
    };
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
  // 打开追踪像素（公开接口，供邮件客户端加载；命中时回写「已打开」）
  @Public()
  @Get('track/:id')
  track(@Param('id') id: string, @Res({ passthrough: true }) res: any) {
    this.svc.trackOpen(id);
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.send(TRACK_GIF);
  }
  @Get('replies') replies(@Query() q: any) { return this.svc.replies(q); }
  @Get('replies/unread-count') unreadCount() { return { count: this.svc.unreadCount() }; }
  @Post('sync-inbox') syncInbox() { return this.svc.syncInbox(); }
  @Post('replies/:id/read') markRead(@Param('id') id: string) { return this.svc.markRead(id); }
}

@Module({
  controllers: [MailController],
  providers: [MailService],
})
export class MailModule {}
