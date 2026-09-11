import { Controller, Get, Post, Delete, Query, Body, Param, Module, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { requireString, optionalNumber } from '../common/validate';

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
    const sorted = rows.sort((a, b) => b.score - a.score);
    // 可选分页：传 page/pageSize 时返回 { rows, total }，否则返回原数组（向后兼容）
    const page = Number(query.page) || 0;
    const pageSize = Number(query.pageSize) || 0;
    if (page > 0 && pageSize > 0) {
      const start = (page - 1) * pageSize;
      return { rows: sorted.slice(start, start + pageSize), total: sorted.length, page, pageSize } as any;
    }
    return sorted;
  }

  create(body: any) {
    // 入参校验：公司名必填，评分需在 0-100（此前缺字段/超范围会直接入库）
    const companyName = requireString(body.companyName, '公司名');
    const score = optionalNumber(body.score ?? 50, '评分', 0, 100, 50);
    const lead = {
      id: this.db.genId('L'),
      companyName,
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
    const created: any[] = [];
    for (const it of items) {
      const score = it.score ?? 50;
      const companyName = String(it.companyName || '').trim();
      const domain = String(it.domain || '').trim();
      if (!companyName) continue;
      // 去重：同域名或同名的线索已存在则跳过，避免重复导入
      if (this.db.db.leads.some((l: any) => (domain && l.domain === domain) || l.companyName === companyName)) continue;
      created.push({
        id: this.db.genId('L'),
        companyName, domain, email: it.email,
        source: it.source || 'import', sourceNote: it.sourceNote || '批量导入',
        custType: it.custType || 'importer', score,
        grade: score >= 80 ? 'A' : score >= 60 ? 'B' : 'C',
        check1: !!it.check1, check2: !!it.check2, check3: !!it.check3,
        assignee: null, status: 'pending', createdAt: new Date().toISOString(),
      });
    }
    this.db.db.leads.unshift(...created);
    this.db.save();
    return { imported: created.length, leads: created };
  }

  convert(id: string, body: any) {
    const lead = this.db.db.leads.find((r) => r.id === id);
    if (!lead) return null;
    const assignee = body?.assignee || lead.assignee || null;

    // 幂等：已转换过则直接复用已生成的客户，避免重复点击产生多个相同客户
    const existed = this.db.db.companies.find((c: any) => c.leadId === id);
    if (lead.status === 'converted' && existed) {
      return { company: existed, lead, reused: true };
    }
    // 去重：同域名或同名客户已存在时复用
    const dup = this.db.db.companies.find(
      (c: any) => (lead.domain && c.domain === lead.domain) || (c.name && c.name === lead.companyName),
    );
    if (dup) {
      lead.status = 'converted';
      lead.assignee = assignee;
      this.db.save();
      return { company: dup, lead, reused: true };
    }

    lead.status = 'converted';
    lead.assignee = assignee;
    const company = {
      id: this.db.genId('C'), leadId: id, name: lead.companyName, domain: lead.domain || null,
      // domain 为空时不再拼出非法的 https://
      website: lead.domain ? `https://${lead.domain}` : null,
      email: lead.email, phone: null,
      address: null, city: null, state: null, country: 'US',
      custType: lead.custType, level: lead.grade || 'B',
      tags: [], owner: assignee, description: '由线索自动转换',
      status: 'active', createdAt: new Date().toISOString(),
    };
    this.db.db.companies.unshift(company);
    this.db.save();
    return { company, lead, reused: false };
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
  @Post(':id/convert')
  convert(@Param('id') id: string, @Body() b: any) {
    const res = this.svc.convert(id, b);
    if (!res) throw new NotFoundException('线索不存在');
    return res;
  }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
