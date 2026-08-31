import { Controller, Get, Post, Put, Delete, Query, Body, Param, Module, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
class LeadsService {
  constructor(private db: DbService) {}

  list(query: any) {
    let rows = [...this.db.db.leads];
    const { custType, source, grade, check, assignee } = query;
    if (custType) rows = rows.filter((r) => r.custType === custType);
    if (source) rows = rows.filter((r) => r.source === source);
    if (grade) rows = rows.filter((r) => r.grade === grade);
    if (assignee) rows = rows.filter((r) => r.assignee === assignee);
    if (check !== undefined && check !== '') {
      const pass = check === 'pass';
      rows = rows.filter((r) =>
        pass ? (r.check1 && r.check2 && r.check3) : (!r.check1 || !r.check2 || !r.check3)
      );
    }
    return rows.sort((a, b) => b.score - a.score);
  }

  create(body: any) {
    const score = body.score ?? 50;
    const lead = {
      id: this.db.genId('L'),
      companyName: body.companyName,
      domain: body.domain,
      source: body.source || 'manual',
      sourceNote: body.sourceNote || '手动录入',
      email: body.email,
      custType: body.custType || 'importer',
      score,
      grade: score >= 80 ? 'A' : score >= 60 ? 'B' : 'C',
      check1: !!body.check1, check2: !!body.check2, check3: !!body.check3,
      assignee: null, status: 'pending', createdAt: new Date().toISOString(),
    };
    this.db.db.leads.unshift(lead);
    this.db.save();
    return lead;
  }

  bulkImport(body: any) {
    const items = Array.isArray(body.items) ? body.items : [];
    const created = items.map((it: any) => {
      const score = it.score ?? 50;
      return {
        id: this.db.genId('L'),
        companyName: it.companyName, domain: it.domain, email: it.email,
        source: it.source || 'import', sourceNote: it.sourceNote || '批量导入',
        custType: it.custType || 'importer', score,
        grade: score >= 80 ? 'A' : score >= 60 ? 'B' : 'C',
        check1: !!it.check1, check2: !!it.check2, check3: !!it.check3,
        assignee: null, status: 'pending', createdAt: new Date().toISOString(),
      };
    });
    this.db.db.leads.unshift(...created);
    this.db.save();
    return { imported: created.length, leads: created };
  }

  convert(id: string, body: any) {
    const lead = this.db.db.leads.find((r) => r.id === id);
    if (!lead) return null;
    lead.status = 'converted';
    lead.assignee = body.assignee || lead.assignee;
    const company = {
      id: this.db.genId('C'), leadId: id, name: lead.companyName, domain: lead.domain,
      website: `https://${lead.domain}`, email: lead.email, phone: null,
      address: null, city: null, state: null, country: 'US',
      custType: lead.custType, level: lead.grade || 'B',
      tags: [], owner: body.assignee || null, description: '由线索自动转换',
      status: 'active', createdAt: new Date().toISOString(),
    };
    this.db.db.companies.unshift(company);
    this.db.save();
    return { company, lead };
  }

  remove(id: string) {
    this.db.db.leads = this.db.db.leads.filter((r) => r.id !== id);
    this.db.save();
    return { ok: true };
  }
}

@Controller('leads')
export class LeadsController {
  constructor(private svc: LeadsService) {}
  @Get() list(@Query() q: any) { return this.svc.list(q); }
  @Post() create(@Body() b: any) { return this.svc.create(b); }
  @Post('import') bulkImport(@Body() b: any) { return this.svc.bulkImport(b); }
  @Post(':id/convert') convert(@Param('id') id: string, @Body() b: any) { return this.svc.convert(id, b); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
