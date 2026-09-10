import { Controller, Get, Post, Put, Delete, Query, Body, Param, Module, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
class CompaniesService {
  constructor(private db: DbService) {}

  list(query: any) {
    let rows = [...this.db.db.companies];
    const { custType, level, owner, tag, keyword } = query;
    if (custType) rows = rows.filter((r) => r.custType === custType);
    if (level) rows = rows.filter((r) => r.level === level);
    if (owner) rows = rows.filter((r) => r.owner === owner);
    if (tag) rows = rows.filter((r) => (r.tags || []).includes(tag));
    if (keyword) rows = rows.filter((r) => (r.name + r.domain).toLowerCase().includes(keyword.toLowerCase()));
    return rows.map((c) => {
      const opps = this.db.db.opportunities.filter((o) => o.companyId === c.id);
      const contacts = this.db.db.contacts.filter((ct) => ct.companyId === c.id);
      return { ...c, oppCount: opps.length, contactCount: contacts.length };
    });
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
    const company = {
      id: this.db.genId('C'), leadId: body.leadId || null, name: body.name, domain: body.domain,
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
    const opp = {
      id: this.db.genId('O'), companyId: body.companyId, stage: body.stage || 'inquiry',
      title: body.title, amount: body.amount || 0, expectedDate: body.expectedDate || null,
      source: body.source || 'manual', createdAt: new Date().toISOString(),
    };
    this.db.db.opportunities.unshift(opp);
    this.db.save();
    return opp;
  }

  updateOpportunity(id: string, body: any) {
    const opp = this.db.db.opportunities.find((o) => o.id === id);
    if (!opp) return null;
    const oldStage = opp.stage;
    Object.assign(opp, body);
    if (oldStage !== opp.stage) {
      this.db.db.activities.unshift({
        id: this.db.genId('A'), companyId: opp.companyId, contactId: null, type: 'note',
        content: `商机「${opp.title}」阶段变更：${oldStage} → ${opp.stage}`,
        operator: 'u1', createdAt: new Date().toISOString(),
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
