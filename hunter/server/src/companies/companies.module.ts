import { Controller, Get, Post, Put, Delete, Query, Body, Param, Module, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { requireString } from '../common/validate';

@Injectable()
class CompaniesService {
  constructor(private db: DbService) {}

  list(query: any) {
    let rows = [...this.db.db.companies];
    const { custType, level, owner, tag, keyword } = query;
    if (custType) rows = rows.filter((r) => r.custType === custType);
    if (level) rows = rows.filter((r) => r.level === level);
    if (owner) {
      // owner=none 表示「未分配负责人」，其余按负责人 id 精确匹配
      rows = owner === 'none'
        ? rows.filter((r) => !r.owner)
        : rows.filter((r) => r.owner === owner);
    }
    if (tag) rows = rows.filter((r) => (r.tags || []).includes(tag));
    if (keyword) rows = rows.filter((r) => (r.name + r.domain).toLowerCase().includes(keyword.toLowerCase()));
    // 先聚合成 Map 再映射，避免每家公司各扫一遍商机/联系人（原为 N+1）
    const oppCount = new Map<string, number>();
    this.db.db.opportunities.forEach((o: any) => {
      oppCount.set(o.companyId, (oppCount.get(o.companyId) || 0) + 1);
    });
    const contactCount = new Map<string, number>();
    this.db.db.contacts.forEach((ct: any) => {
      contactCount.set(ct.companyId, (contactCount.get(ct.companyId) || 0) + 1);
    });
    const total = rows.length;
    // 可选分页：传 page/pageSize 时返回 { rows, total }，否则返回原数组（向后兼容旧调用）
    const page = Number((query as any).page) || 0;
    const pageSize = Number((query as any).pageSize) || 0;
    const paged = page > 0 && pageSize > 0
      ? rows.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
      : rows;
    const mapped = paged.map((c) => ({
      ...c,
      oppCount: oppCount.get(c.id) || 0,
      contactCount: contactCount.get(c.id) || 0,
    }));
    return page > 0 && pageSize > 0
      ? ({ rows: mapped, total, page, pageSize } as any)
      : (mapped as any);
  }

  tags() {
    const set = new Set<string>();
    this.db.db.companies.forEach((c) => (c.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }

  detail(id: string) {
    const company = this.db.db.companies.find((c) => c.id === id);
    if (!company) return null;
    const contacts = this.db.db.contacts.filter((c) => c.companyId === id);
    const opportunities = this.db.db.opportunities.filter((o) => o.companyId === id);
    const activities = this.db.db.activities
      .filter((a) => a.companyId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const mails = this.db.db.mailRecords.filter((m) => m.companyId === id);
    return { company, contacts, opportunities, activities, mails };
  }

  create(body: any) {
    // 入参校验：公司名必填（此前缺 name 会创建无名客户）
    const name = requireString(body.name, '公司名');
    const company = {
      id: this.db.genId('C'), leadId: body.leadId || null, name, domain: body.domain,
      website: body.website || (body.domain ? `https://${body.domain}` : null),
      email: body.email, phone: body.phone || null, address: body.address || null,
      city: body.city || null, state: body.state || null, country: body.country || 'US',
      custType: body.custType || 'importer', level: body.level || 'B', source: body.source || null, tags: body.tags || [],
      owner: body.owner || null, description: body.description || '', status: 'active',
      createdAt: new Date().toISOString(),
    };
    this.db.db.companies.unshift(company);
    this.db.save();
    return company;
  }

  update(id: string, body: any) {
    const company = this.db.db.companies.find((c) => c.id === id);
    if (!company) return null;
    Object.assign(company, body);
    this.db.save();
    return company;
  }

  addContact(body: any) {
    const contact = {
      id: this.db.genId('CT'), companyId: body.companyId, name: body.name,
      titleRole: body.titleRole || 'owner', title: body.title || 'Owner / CEO',
      linkedin: body.linkedin || null, email: body.email || null, phone: body.phone || null,
      touchStatus: 'untouched', createdAt: new Date().toISOString(),
    };
    this.db.db.contacts.unshift(contact);
    this.db.save();
    return contact;
  }

  updateContact(id: string, body: any) {
    const contact = this.db.db.contacts.find((c) => c.id === id);
    if (!contact) return null;
    Object.assign(contact, body);
    this.db.save();
    return contact;
  }

  addActivity(body: any) {
    const activity = {
      id: this.db.genId('A'), companyId: body.companyId, contactId: body.contactId || null,
      type: body.type || 'note', content: body.content, operator: body.operator || 'u1',
      createdAt: new Date().toISOString(),
    };
    this.db.db.activities.unshift(activity);
    this.db.save();
    return activity;
  }

  addOpportunity(body: any) {
    const stage = body.stage || 'inquiry';
    const now = new Date().toISOString();
    const opp = {
      id: this.db.genId('O'), companyId: body.companyId, stage,
      title: body.title, amount: Number(body.amount) || 0, expectedDate: body.expectedDate || null,
      source: body.source || 'manual', createdAt: now,
      // 记录成交时间，供「平均成交周期」KPI 使用
      wonAt: stage === 'won' ? now : null,
    };
    this.db.db.opportunities.unshift(opp);
    this.db.save();
    return opp;
  }

  updateOpportunity(id: string, body: any) {
    const opp = this.db.db.opportunities.find((o) => o.id === id);
    if (!opp) return null;
    const oldStage = opp.stage;
    // 字段白名单：防止客户端篡改 id / companyId / createdAt
    if (body.stage !== undefined) opp.stage = body.stage;
    if (body.title !== undefined) opp.title = body.title;
    if (body.amount !== undefined) opp.amount = Number(body.amount) || 0;
    if (body.expectedDate !== undefined) opp.expectedDate = body.expectedDate;
    if (body.source !== undefined) opp.source = body.source;
    if (oldStage !== opp.stage) {
      const now = new Date().toISOString();
      // 首次进入 won 时记录成交时间，供「平均成交周期」KPI 使用
      if (opp.stage === 'won' && !opp.wonAt) opp.wonAt = now;
      this.db.db.activities.unshift({
        id: this.db.genId('A'), companyId: opp.companyId, contactId: null, type: 'note',
        content: `商机「${opp.title}」阶段变更：${oldStage} → ${opp.stage}`,
        operator: 'u1', createdAt: now,
      });
    }
    this.db.save();
    return opp;
  }
}

@Controller('companies')
export class CompaniesController {
  constructor(private svc: CompaniesService) {}
  @Get() list(@Query() q: any) { return this.svc.list(q); }
  @Get('tags') tags() { return this.svc.tags(); }
  @Get(':id') detail(@Param('id') id: string) { return this.svc.detail(id); }
  @Post() create(@Body() b: any) { return this.svc.create(b); }
  @Put(':id') update(@Param('id') id: string, @Body() b: any) { return this.svc.update(id, b); }
  @Post('contacts') addContact(@Body() b: any) { return this.svc.addContact(b); }
  @Put('contacts/:id') updateContact(@Param('id') id: string, @Body() b: any) { return this.svc.updateContact(id, b); }
  @Post('activities') addActivity(@Body() b: any) { return this.svc.addActivity(b); }
  @Post('opportunities') addOpportunity(@Body() b: any) { return this.svc.addOpportunity(b); }
  @Put('opportunities/:id') updateOpportunity(@Param('id') id: string, @Body() b: any) { return this.svc.updateOpportunity(id, b); }
}

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
