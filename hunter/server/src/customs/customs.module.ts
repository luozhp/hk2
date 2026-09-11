import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  Module,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { DbService } from '../db/db.service';

type SourceMode = 'import' | 'blocked' | 'api_limited' | 'api_free';

interface SourceDef {
  key: string;
  name: string;
  provider: string;
  countries: string;
  coverage: string;
  mode: SourceMode;
  hint: string;
  url: string; // 官网 / 申请入口（blocked 源为空）
}

/**
 * 海关数据数据源清单。
 * - import   ：商业提单（ImportGenius/Volza 等），数据可导出 CSV 由本系统「导入」成线索
 * - api_free ：免费官方 API，可在线按 HS 编码查询进出口统计（无公司名，用于选品/选市场）
 * - blocked  ：不公开 / 无合规 API，系统不可获取，前端给醒目提示 + 替代方案
 * - api_limited ：接口受限 / 本期未接入
 * 真实搜索（Google / SerpAPI）属于另一模块，这里不混入。
 */
const CUSTOMS_SOURCES: SourceDef[] = [
  {
    key: 'US_BOL',
    name: '美国进口提单 (BOL)',
    provider: 'ImportGenius / Panjiva / Trademo',
    countries: '美国进口',
    coverage: '进口商、供应商、HS 编码、货量、到港日期、原产国',
    mode: 'import',
    hint: '数据依美国 FOIA 公开，买家质量最高。从这些平台导出 CSV 后，用本页「导入 CSV」上传即可转为线索。',
    url: 'https://www.importgenius.com/',
  },
  {
    key: 'VOLZA',
    name: 'Volza（多国 BOL）',
    provider: 'Volza',
    countries: '美国 / 印度 / 越南 等 20+ 国',
    coverage: '进口商、供应商、货量、到港日期、原产国',
    mode: 'import',
    hint: '性价比最高的商业海关数据，覆盖多国。导出 CSV 后导入本系统即可批量成线索（亦提供需签约的 API，本期走导入）。',
    url: 'https://www.volza.com/',
  },
  {
    key: 'INDIA',
    name: '印度海关数据',
    provider: 'Zauba（免费）/ Volza',
    countries: '印度进出口',
    coverage: '进口商、供应商、货量、到港日期',
    mode: 'import',
    hint: 'Zauba 提供免费查询与有限导出，Volza 可整库导出。导出后导入本系统。',
    url: 'https://www.zauba.com/',
  },
  {
    key: 'EU_VN',
    name: '欧盟 / 越南等海关',
    provider: 'Volza / 各国官方',
    countries: '欧盟多国 / 越南 等',
    coverage: '进口商、供应商、货量',
    mode: 'import',
    hint: '欧洲与东南亚部分国家开放海关统计。经 Volza 等导出后导入本系统。',
    url: 'https://www.volza.com/',
  },
  {
    key: 'US_CENSUS',
    name: 'US Census 贸易 API（免费）',
    provider: '美国人口普查局（官方 · 免费 Key）',
    countries: '美国进出口（统计级）',
    coverage: '按 HS 编码 × 国家 × 月度的进出口额 / 净重（无公司名）',
    mode: 'api_free',
    hint: '已接入美国人口普查局免费官方 API（api.census.gov，需免费 Key）。输入 HS 编码可查该品类在美进口规模、来源国分布与月度趋势。统计级数据、无公司名，用于选品 / 选市场，而非直接找买家。',
    url: 'https://api.census.gov/data/key_signup.html',
  },
  {
    key: 'CN_CUSTOMS',
    name: '中国出口海关数据',
    provider: '不公开（灰色渠道）',
    countries: '中国出口',
    coverage: '—（企业级数据不公开）',
    mode: 'blocked',
    hint: '中国海关不公开企业级出口数据，无合规 API；商业公司的“中国海关数据”为灰色间接数据，本系统不支持接入。替代方案：① 用「美国 / 印度 BOL」反查从中国采购的买家；② 用「线索采集（Google）」或「展会名录」开发。',
    url: '',
  },
];

/** 简单把公司名推断成占位域名（仅用于线索落地页跳转，导入时若有真实邮箱/域名以真实值为准） */
function inferDomain(company: string): string {
  if (!company) return '';
  const cleaned = company
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join('');
  return cleaned ? `${cleaned}.com` : '';
}

@Injectable()
class CustomsService {
  constructor(private db: DbService) {}

  sources() {
    return CUSTOMS_SOURCES;
  }

  list() {
    return [...(this.db.db.customsRecords || [])].sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt)),
    );
  }

  /**
   * 导入海关记录：每条记录同时生成一条「海关数据」来源线索，
   * 以便进入线索池、邮件中心与看板统计（source=customs 已预留）。
   */
  import(body: any) {
    const source = CUSTOMS_SOURCES.find((s) => s.key === body?.sourceKey);
    if (!source) throw new BadRequestException('未知数据源');
    if (source.mode === 'blocked') {
      throw new BadRequestException('该数据源不可获取，无法导入');
    }
    const records = Array.isArray(body.records) ? body.records : [];
    const created: any[] = [];
    for (const r of records) {
      const importer = String(r.importer || r.companyName || '').trim();
      if (!importer) continue;
      let domain = String(r.domain || '').trim();
      if (!domain && r.email) domain = String(r.email).split('@')[1] || '';
      if (!domain) domain = inferDomain(importer);

      // 去重：同域名或同名的海关记录已存在则跳过，避免重复导入产生重复线索
      if (this.db.db.customsRecords?.some((x: any) => (domain && x.importerDomain === domain) || x.importer === importer)) {
        continue;
      }

      const rec: any = {
        id: this.db.genId('CR'),
        sourceKey: source.key,
        sourceLabel: source.name,
        importer,
        importerDomain: domain || null,
        email: r.email || null,
        supplier: r.supplier || null,
        hsCode: r.hsCode || null,
        teu: r.teu ?? null,
        weightKg: r.weightKg ?? null,
        arrivalDate: r.arrivalDate || null,
        originCountry: r.originCountry || null,
        leadId: null,
        createdAt: new Date().toISOString(),
      };
      this.db.db.customsRecords.unshift(rec);

      const lead: any = {
        id: this.db.genId('L'),
        companyName: importer,
        domain,
        source: 'customs',
        sourceNote: `海关数据 · ${source.name}`,
        email: r.email || null,
        custType: 'importer',
        score: 78, // 海关数据买家质量高
        grade: 'A',
        check1: true,
        check2: !!r.email,
        check3: !!domain,
        assignee: null,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      this.db.db.leads.unshift(lead);
      rec.leadId = lead.id;
      created.push(rec);
    }
    this.db.save();
    return { imported: created.length, records: created };
  }

  remove(id: string) {
    const rec = (this.db.db.customsRecords || []).find((r) => r.id === id);
    if (!rec) throw new NotFoundException('记录不存在');
    if (rec.leadId) {
      this.db.db.leads = this.db.db.leads.filter((l) => l.id !== rec.leadId);
    }
    this.db.db.customsRecords = (this.db.db.customsRecords || []).filter(
      (r) => r.id !== id,
    );
    this.db.save();
    return { ok: true };
  }

  /** 免费官方 API 在线查询（当前实现 US Census） */
  async query(q: any) {
    const src = CUSTOMS_SOURCES.find((s) => s.key === q?.source);
    if (!src) throw new BadRequestException('未知数据源');
    if (src.mode !== 'api_free') throw new BadRequestException('该数据源不支持在线查询');
    if (src.key === 'US_CENSUS') return this.queryCensus(q);
    throw new BadRequestException('该免费源暂未实现查询');
  }

  /** 美国人口普查局国际贸易 API：按 HS 编码查进出口统计（无公司名） */
  private async queryCensus(q: any) {
    const key = process.env.CENSUS_API_KEY;
    if (!key) {
      throw new BadRequestException(
        '未配置 CENSUS_API_KEY（免费申请：https://api.census.gov/data/key_signup.html），请在 server/.env 填入后重启',
      );
    }
    const flow = q?.flow === 'export' ? 'exports' : 'imports';
    const hs = String(q?.hsCode || '').replace(/\D/g, '');
    if (!hs) throw new BadRequestException('请提供 HS 编码（如 280420）');
    const year = String(q?.year || new Date().getFullYear() - 1);
    const url = `https://api.census.gov/data/timeseries/intltrade/${flow}/enduse`;
    const params = new URLSearchParams({
      get: 'GEN_ID,CTY_NAME,TRADE_DATE,ALL_VAL_MO,ALL_VAL_YR,NET_WT',
      GEN_ID: hs,
      time: year,
      key,
    });
    let resp: any;
    try {
      const r = await axios.get(`${url}?${params.toString()}`, { timeout: 15000 });
      resp = r.data;
    } catch (err: any) {
      const cm = err?.response?.data?.message || err?.response?.data?.error || err?.message || '网络错误';
      throw new BadRequestException(`调用 Census API 失败：${cm}`);
    }
    const rows = Array.isArray(resp) ? resp : [];
    const base = {
      flow,
      year,
      hsCode: hs,
      columns: ['国家', '年度贸易额(USD)', '净重(kg)', '有数据月份'],
    };
    if (rows.length < 2) {
      return {
        ...base,
        rows: [],
        note: '该 HS 编码在所选年份无返回数据（可尝试其他 HS 编码或年份）。',
      };
    }
    const header = rows[0] as string[];
    const idx = (n: string) => header.indexOf(n);
    const detail = (rows as string[][])
      .slice(1)
      .map((r) => ({
        country: r[idx('CTY_NAME')],
        valueYr: Number(r[idx('ALL_VAL_YR')] || 0),
        weightKg: Number(r[idx('NET_WT')] || 0),
      }))
      .filter((x) => x.country);
    // ALL_VAL_YR 是「年度累计值」（每月一行，值递增至年末），逐行累加会把贸易额放大约 N 倍；
    // 年度金额取最大值（即全年累计），净重为月度值才累加。
    const byC: Record<string, { country: string; valueYr: number; weightKg: number; months: number }> = {};
    for (const x of detail) {
      byC[x.country] = byC[x.country] || { country: x.country, valueYr: 0, weightKg: 0, months: 0 };
      byC[x.country].valueYr = Math.max(byC[x.country].valueYr, x.valueYr);
      byC[x.country].weightKg += x.weightKg;
      byC[x.country].months += 1;
    }
    const countries = Object.values(byC).sort((a, b) => b.valueYr - a.valueYr);
    return {
      ...base,
      rows: countries.map((c) => [c.country, c.valueYr, Math.round(c.weightKg), c.months]),
      note: '数据来源：美国人口普查局国际贸易 API（统计级，无公司名；用于判断品类在美进口规模与来源国分布）。',
    };
  }
}

@Controller('customs')
export class CustomsController {
  constructor(private svc: CustomsService) {}
  @Get('sources') sources() {
    return this.svc.sources();
  }
  @Get('records') list() {
    return this.svc.list();
  }
  @Get('query') query(@Query() q: any) {
    return this.svc.query(q);
  }
  @Post('import') importData(@Body() b: any) {
    return this.svc.import(b);
  }
  @Delete('records/:id') remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}

@Module({
  controllers: [CustomsController],
  providers: [CustomsService],
})
export class CustomsModule {}
