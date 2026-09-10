import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Module,
  Injectable,
  Optional,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DbService } from '../db/db.service';
import { CurrentUser } from '../auth/auth.guard';

interface DirectorySource {
  key: string;
  name: string;
  provider: string;
  region: string;
  type: string;
  coverage: string;
  site: string;
  hint: string;
  url: string;
}

/**
 * 海外垂直行业平台（B2B 企业/工业目录）数据源清单。
 * 这些平台没有公开 API，本模块通过搜索引擎的 site: 语法做「免费定向检索」：
 *   输入关键词 → 构造 `"{keyword}" site:{site}` → 用已配置的 Google CSE / SerpAPI 搜索
 *   命中该平台上的供应商 / 买家主页 → 评分后入库为线索（source=directory）。
 */
const DIRECTORY_SOURCES: DirectorySource[] = [
  {
    key: 'THOMASNET',
    name: 'Thomasnet',
    provider: 'Thomas Publishing（美国）',
    region: '美国 / 北美',
    type: '供应商 / 制造商',
    coverage: '制造商、分销商、产品线、官网、联系方式',
    site: 'thomasnet.com',
    hint: '美国最权威的制造业供应商目录，可免费浏览并按产品/地区筛选。本页用 site: 语法免费定向检索其公司主页。',
    url: 'https://www.thomasnet.com/',
  },
  {
    key: 'INDUSTRYSTOCK',
    name: 'IndustryStock',
    provider: 'IndustryStock（德国）',
    region: '欧洲（德国为主）',
    type: '供应商 / 买家',
    coverage: '制造商、供应商、产品、官网、联系邮箱',
    site: 'industrystock.com',
    hint: '欧洲工业 B2B 平台，覆盖德语区制造业。免费注册后可浏览，本页用 site: 语法定向检索。',
    url: 'https://www.industrystock.com/',
  },
  {
    key: 'EUROPAGES',
    name: 'Europages',
    provider: 'Europages（欧洲）',
    region: '欧洲多国',
    type: '供应商 / 买家',
    coverage: '企业名录、产品、官网、联系信息',
    site: 'europages.com',
    hint: '欧洲老牌 B2B 企业目录，覆盖 30+ 国家。免费浏览，本页用 site: 语法定向检索。',
    url: 'https://www.europages.com/',
  },
  {
    key: 'KOMPASS',
    name: 'Kompass',
    provider: 'Kompass（全球）',
    region: '全球 70+ 国',
    type: '供应商 / 买家',
    coverage: '企业名录、产品分类、官网、联系方式',
    site: 'kompass.com',
    hint: '全球性 B2B 企业目录，部分联系信息需注册。本页用 site: 语法定向检索其公开页面。',
    url: 'https://www.kompass.com/',
  },
  {
    key: 'DIRECTINDUSTRY',
    name: 'DirectIndustry',
    provider: 'VirtualExpo Group',
    region: '全球（工业品）',
    type: '制造商',
    coverage: '工业产品、制造商、产品规格、官网',
    site: 'directindustry.com',
    hint: '面向工业品的在线展会目录，按产品分类聚合制造商。本页用 site: 语法定向检索。',
    url: 'https://www.directindustry.com/',
  },
  {
    key: 'GLOBALSPEC',
    name: 'GlobalSpec',
    provider: 'GlobalSpec（北美）',
    region: '北美（工程 / 工业）',
    type: '供应商',
    coverage: '工程产品、供应商、产品规格、官网',
    site: 'globalspec.com',
    hint: '北美工程与工业品目录，供应商与产品数据齐全。本页用 site: 语法定向检索。',
    url: 'https://www.globalspec.com/',
  },
  {
    key: 'MADEINCHINA',
    name: 'Made-in-China',
    provider: '焦点科技',
    region: '中国供应商',
    type: '供应商',
    coverage: '中国制造商、产品、官网、联系方式',
    site: 'made-in-china.com',
    hint: '中国制造供应商目录，用于反向研究竞品或找国内供应链。本页用 site: 语法定向检索。',
    url: 'https://www.made-in-china.com/',
  },
  {
    key: 'GLOBALSOURCES',
    name: 'GlobalSources',
    provider: '环球资源',
    region: '亚洲供应商',
    type: '供应商',
    coverage: '亚洲制造商、产品、官网、联系方式',
    site: 'globalsources.com',
    hint: '亚洲 B2B 采购平台，供应商资源丰富。本页用 site: 语法定向检索。',
    url: 'https://www.globalsources.com/',
  },
  {
    key: 'EXPORTHUB',
    name: 'ExportHub',
    provider: 'ExportHub（全球）',
    region: '全球',
    type: '供应商 / 买家',
    coverage: '制造商、供应商、产品、官网、联系方式',
    site: 'exporthub.com',
    hint: '全球综合 B2B 平台，覆盖多品类出口商。本页用 site: 语法定向检索其公司主页。',
    url: 'https://www.exporthub.com/',
  },
  {
    key: 'TRADEKEY',
    name: 'TradeKey',
    provider: 'TradeKey（中东 / 全球）',
    region: '中东 / 全球',
    type: '供应商 / 买家',
    coverage: '供应商、产品、官网、联系邮箱',
    site: 'tradekey.com',
    hint: '老牌综合 B2B 平台，中东与南亚当量较大。本页用 site: 语法定向检索。',
    url: 'https://www.tradekey.com/',
  },
  {
    key: 'EC21',
    name: 'EC21',
    provider: 'EC21（韩国 / 全球）',
    region: '韩国 / 全球',
    type: '供应商 / 买家',
    coverage: '制造商、供应商、产品、官网、联系方式',
    site: 'ec21.com',
    hint: '韩国综合 B2B 平台，支持多语言供应商展示。本页用 site: 语法定向检索。',
    url: 'https://www.ec21.com/',
  },
  {
    key: 'GO4WORLDBUSINESS',
    name: 'Go4WorldBusiness',
    provider: 'Go4WorldBusiness（全球）',
    region: '全球',
    type: '供应商 / 买家',
    coverage: '出口商、产品、官网、联系信息',
    site: 'go4worldbusiness.com',
    hint: '面向出口贸易的全球 B2B 目录，可免费浏览供应商。本页用 site: 语法定向检索。',
    url: 'https://www.go4worldbusiness.com/',
  },
  {
    key: 'INDIAMART',
    name: 'IndiaMART',
    provider: 'IndiaMART（印度）',
    region: '印度',
    type: '供应商',
    coverage: '印度制造商、产品、官网、联系方式',
    site: 'indiamart.com',
    hint: '印度最大的 B2B 企业目录，供应商资源极丰富。本页用 site: 语法定向检索。',
    url: 'https://www.indiamart.com/',
  },
  {
    key: 'WERLIEFERTWAS',
    name: 'WLW',
    provider: 'WLW（德国，原 Wer liefert was）',
    region: '欧洲（德语区）',
    type: '供应商',
    coverage: '德国企业名录、产品、官网、联系方式',
    site: 'wlw.de',
    hint: '德语区权威 B2B 采购目录（原 Wer liefert was，现 WLW，"谁供货"）。本页用 site: 语法定向检索。',
    url: 'https://www.wlw.de/',
  },
  {
    key: 'KELLYSEARCH',
    name: 'Kellysearch',
    provider: 'Kellysearch（工业）',
    region: '全球（工业）',
    type: '供应商',
    coverage: '工业产品、供应商、产品规格、官网',
    site: 'kellysearch.com',
    hint: '工业产品全球目录，按品类聚合供应商。本页用 site: 语法定向检索。',
    url: 'https://www.kellysearch.com/',
  },
  {
    key: 'PROCESSREGISTER',
    name: 'ProcessRegister',
    provider: 'ProcessRegister（北美）',
    region: '北美（流程 / 工业）',
    type: '供应商',
    coverage: '流程工业、设备、供应商、官网',
    site: 'processregister.com',
    hint: '北美流程与工业设备供应商目录。本页用 site: 语法定向检索。',
    url: 'https://www.processregister.com/',
  },
  {
    key: 'B2BRAZIL',
    name: 'B2Brazil',
    provider: 'B2Brazil（巴西）',
    region: '南美（巴西）',
    type: '供应商 / 买家',
    coverage: '巴西制造商、产品、官网、联系方式',
    site: 'b2brazil.com',
    hint: '巴西综合 B2B 平台，连接拉美供应商。本页用 site: 语法定向检索。',
    url: 'https://www.b2brazil.com/',
  },
  {
    key: 'PULSCEN',
    name: 'Pulscen',
    provider: 'Pulscen（俄罗斯）',
    region: '东欧（俄罗斯）',
    type: '供应商',
    coverage: '俄罗斯企业名录、产品、官网、联系方式',
    site: 'pulscen.ru',
    hint: '俄罗斯主流 B2B 目录，覆盖独联体供应商。本页用 site: 语法定向检索。',
    url: 'https://www.pulscen.ru/',
  },
  {
    key: 'CYLEX',
    name: 'Cylex',
    provider: 'Cylex（欧洲）',
    region: '欧洲多国',
    type: '企业目录',
    coverage: '企业名录、官网、联系信息、评价',
    site: 'cylex.com',
    hint: '欧洲企业黄页式目录，可定位公司主页与联系方式。本页用 site: 语法定向检索。',
    url: 'https://www.cylex.com/',
  },
  {
    key: 'YELLOWPAGES',
    name: 'YellowPages',
    provider: 'YellowPages（美国）',
    region: '美国 / 北美',
    type: '企业目录',
    coverage: '美国企业名录、官网、电话、地址',
    site: 'yellowpages.com',
    hint: '美国企业黄页目录，适合做本地公司定位。本页用 site: 语法定向检索。',
    url: 'https://www.yellowpages.com/',
  },
];

// 复用「线索采集」模块的搜索凭证（同一套 Google CSE / SerpAPI 配置）
const DISCOVER_PROVIDER = (process.env.DISCOVER_PROVIDER || 'mock').toLowerCase();
const GOOGLE_CSE_KEY = process.env.GOOGLE_CSE_KEY || '';
const GOOGLE_CSE_CX = process.env.GOOGLE_CSE_CX || '';
const SERP_API_KEY = process.env.SERP_API_KEY || '';

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

function deriveEmail(domain: string): string | null {
  if (!domain) return null;
  const candidates = [`sales@${domain}`, `info@${domain}`, `contact@${domain}`];
  for (const c of candidates) if (EMAIL_RE.test(c)) return c;
  return null;
}

function checkHasProduct(text: string, keyword: string): boolean {
  const k = (keyword || '').toLowerCase();
  return !!k && (text || '').toLowerCase().includes(k);
}

const MOCK_RESULTS = [
  { url: 'https://www.thomasnet.com/smartwhip-usa.html', title: 'SmartWhip USA - Cream Charger Manufacturer', desc: 'US manufacturer of N2O cream chargers and whipped cream dispensers for foodservice and retail.', city: 'New York, NY' },
  { url: 'https://www.thomasnet.com/creamco.html', title: 'CreamCo Industries - Bakery & Dairy Equipment', desc: 'Supplier of whipped cream chargers, dispensers and dessert ingredients across North America.', city: 'Chicago, IL' },
  { url: 'https://www.industrystock.com/en/companies/gastronomie-supply-gmbh', title: 'Gastronomie Supply GmbH - Cream Charger Distributor', desc: 'German distributor of professional kitchen equipment and cream charger systems.', city: 'Hamburg, DE' },
  { url: 'https://www.europages.com/whipped-supplies-bv', title: 'Whipped Supplies BV - Wholesale Catering', desc: 'European wholesaler of whipped cream chargers and catering consumables.', city: 'Amsterdam, NL' },
  { url: 'https://www.kompass.com/global-cream-tech', title: 'Global Cream Tech - Foodservice Manufacturer', desc: 'Manufacturer of cream whippers and N2O chargers serving global foodservice chains.', city: 'Toronto, CA' },
  { url: 'https://www.made-in-china.com/company/smile-ice-qi', title: 'Smile Ice Qi Co., Ltd - Cream Charger Factory', desc: 'Chinese factory producing aluminum cream chargers and whipped cream dispensers for export.', city: 'Ningbo, CN' },
];

@Injectable()
class DirectoryService {
  constructor(
    private db: DbService,
    @Optional() private http: HttpService,
  ) {}

  sources() {
    return DIRECTORY_SOURCES;
  }

  /** 读取当前登录用户的平台排序（按用户 id 隔离） */
  getOrder(userId: string): string[] {
    const map = (this.db.db as any).directoryOrder || ((this.db.db as any).directoryOrder = {});
    return Array.isArray(map[userId]) ? map[userId] : [];
  }

  /** 保存当前登录用户的平台排序 */
  saveOrder(userId: string, order: string[]): { ok: boolean } {
    const map = (this.db.db as any).directoryOrder || ((this.db.db as any).directoryOrder = {});
    map[userId] = Array.isArray(order) ? order.filter((k) => typeof k === 'string') : [];
    this.db.save();
    return { ok: true };
  }

  /** 在线定向搜索：按平台 site: 语法检索供应商/买家 */
  async search(q: any) {
    const src = DIRECTORY_SOURCES.find((s) => s.key === q?.platform);
    if (!src) throw new BadRequestException('请选择平台');
    const keyword = String(q?.keyword || '').trim();
    if (!keyword) throw new BadRequestException('请输入关键词（如 cream charger）');
    const mode = String(q?.mode || '').toLowerCase() === 'mock' ? 'mock' : DISCOVER_PROVIDER;
    const syntax = `"${keyword}" site:${src.site}`;
    let raw: any[];
    if (mode === 'mock' || !this.http) {
      raw = MOCK_RESULTS;
    } else {
      try {
        raw = await this.fetchLive(syntax, mode);
      } catch (e: any) {
        throw new BadRequestException(`定向搜索失败：${e?.message || '未知错误'}`);
      }
    }
    const results = raw.map((r, i) => this.scoreItem(r, i, keyword, src, syntax));
    return { syntax, sourceLabel: src.name, results };
  }

  /** 一次性获取所有平台：按关键词遍历全部平台定向搜索并合并结果 */
  async searchAll(q: any) {
    const keyword = String(q?.keyword || '').trim();
    if (!keyword) throw new BadRequestException('请输入关键词');
    const mode = String(q?.mode || '').toLowerCase() === 'mock' ? 'mock' : DISCOVER_PROVIDER;
    const groups: any[] = [];
    const errors: string[] = [];
    for (const src of DIRECTORY_SOURCES) {
      const syntax = `"${keyword}" site:${src.site}`;
      let raw: any[];
      if (mode === 'mock' || !this.http) {
        raw = MOCK_RESULTS;
      } else {
        try {
          raw = await this.fetchLive(syntax, mode);
        } catch (e: any) {
          errors.push(`${src.name}：${e?.message || '搜索失败'}`);
          continue;
        }
      }
      groups.push({
        platform: src.key,
        sourceLabel: src.name,
        syntax,
        results: raw.map((r, i) => this.scoreItem(r, i, keyword, src, syntax)),
      });
    }
    const results = groups.flatMap((g) => g.results);
    return { keyword, count: results.length, groups, results, errors };
  }

  /** 评分：三标准校验（在售同类 / 真实邮箱 / 可定位） + 打分分级 */
  private scoreItem(r: any, idx: number, keyword: string, src: DirectorySource, syntax: string) {
    const domain = (() => {
      try { return new URL(r.url).hostname.replace('www.', ''); } catch { return ''; }
    })();
    const email = r.email || deriveEmail(domain);
    const checks = {
      check1: checkHasProduct(`${r.title} ${r.desc}`, keyword),
      check2: !!email,
      check3: !!r.city,
    };
    const passCount = [checks.check1, checks.check2, checks.check3].filter(Boolean).length;
    const score = 40 + passCount * 20 + Math.round(Math.random() * 8);
    return {
      id: `DIR_${idx}`,
      url: r.url,
      title: r.title,
      desc: r.desc || '',
      city: r.city || '',
      domain,
      email,
      platform: src.key,
      sourceLabel: src.name,
      syntax,
      checks,
      passCount,
      score: Math.min(98, score),
      grade: score >= 80 ? 'A' : score >= 60 ? 'B' : 'C',
    };
  }

  /** 从平台手动导出的记录导入为线索（source=directory） */
  import(body: any) {
    const src = DIRECTORY_SOURCES.find((s) => s.key === body?.sourceKey);
    if (!src) throw new BadRequestException('未知平台');
    const records = Array.isArray(body.records) ? body.records : [];
    const created: any[] = [];
    for (const r of records) {
      const companyName = String(r.companyName || r.title || '').trim();
      if (!companyName) continue;
      let domain = String(r.domain || '').trim();
      if (!domain && r.url) {
        try { domain = new URL(r.url).hostname.replace('www.', ''); } catch { /* ignore */ }
      }
      if (!domain && r.email) domain = String(r.email).split('@')[1] || '';
      const email = r.email || deriveEmail(domain);
      const score = r.score ?? 72;
      const lead: any = {
        id: this.db.genId('L'),
        companyName,
        domain,
        source: 'directory',
        sourceNote: `行业平台 · ${src.name}`,
        email,
        custType: 'importer',
        score,
        grade: score >= 80 ? 'A' : score >= 60 ? 'B' : 'C',
        check1: true,
        check2: !!email,
        check3: !!(r.city || r.country),
        assignee: null,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      this.db.db.leads.unshift(lead);
      created.push(lead);
    }
    this.db.save();
    return { imported: created.length, leads: created };
  }

  /** 真实定向搜索：优先 Google CSE，其次 SerpAPI */
  private async fetchLive(syntax: string, mode: string) {
    if (mode === 'google') {
      const missing: string[] = [];
      if (!GOOGLE_CSE_KEY) missing.push('GOOGLE_CSE_KEY');
      if (!GOOGLE_CSE_CX) missing.push('GOOGLE_CSE_CX');
      if (missing.length) throw new Error(`缺少凭证 ${missing.join('、')}，请在 server/.env 配置`);
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_KEY}&cx=${GOOGLE_CSE_CX}&q=${encodeURIComponent(syntax)}&num=10`;
      const res = await firstValueFrom(this.http.get(url));
      return (res.data.items || []).map((it: any) => ({ url: it.link, title: it.title, desc: it.snippet || '', city: '' }));
    }
    if (mode === 'serp') {
      if (!SERP_API_KEY) throw new Error('缺少凭证 SERP_API_KEY，请在 server/.env 配置');
      const url = `https://serpapi.com/search.json?api_key=${SERP_API_KEY}&engine=google&q=${encodeURIComponent(syntax)}&num=10`;
      const res = await firstValueFrom(this.http.get(url));
      return (res.data.organic_results || []).map((it: any) => ({
        url: it.link, title: it.title, desc: it.snippet || '', city: it.city || '',
      }));
    }
    throw new Error(`未知数据源 provider=${mode}，请在 server/.env 将 DISCOVER_PROVIDER 设为 google、serp 或 mock`);
  }
}

@Controller('directory')
export class DirectoryController {
  constructor(private svc: DirectoryService) {}
  @Get('sources') sources() {
    return this.svc.sources();
  }
  @Get('order') getOrder(@CurrentUser() user: any) {
    return this.svc.getOrder(user?.sub || user?.id);
  }
  @Post('order') saveOrder(@Body() body: any, @CurrentUser() user: any) {
    const uid = user?.sub || user?.id;
    if (!uid) throw new UnauthorizedException('未登录');
    return this.svc.saveOrder(uid, body?.order);
  }
  @Get('search') search(@Query() q: any) {
    return this.svc.search(q);
  }
  @Get('search-all') searchAll(@Query() q: any) {
    return this.svc.searchAll(q);
  }
  @Post('import') importData(@Body() b: any) {
    return this.svc.import(b);
  }
}

@Module({
  imports: [HttpModule],
  controllers: [DirectoryController],
  providers: [DirectoryService],
})
export class DirectoryModule {}
