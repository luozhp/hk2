import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Put,
  Delete,
  Module,
  Injectable,
  Optional,
  BadRequestException,
} from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DbService } from '../db/db.service';

export interface ExpoFair {
  id: string;
  name: string;
  enName: string;
  region: string;
  industry: string;
  city: string;
  country: string;
  website: string;
  period: string;
  /** 举办日期区间（YYYY-MM-DD），用于判断是否进行中 */
  dateStart?: string;
  dateEnd?: string;
  fetchable: boolean;
  note: string;
  /** 在售同类默认判定关键词，前端可编辑覆盖 */
  productHints?: string[];
}

/**
 * 国际专业展会（含广交会与海外行业展）数据源清单。
 * 展会一般提供官方「参展商名录 / Exhibitor List」页面。本模块支持两种拉取方式：
 *   1) 真实拉取：复用「线索采集」已配置的 Google CSE / SerpAPI 凭证，
 *      以 `site:{fair.website}` 限定检索该展会的参展商 / 展商主页，命中后评分入库（source=expo）。
 *   2) 模拟数据：未配置凭证时返回各展会预置的示例展商，保证原型流程可演示。
 * 说明：部分展会官网对爬虫有限制，正式批量建议购买官方展商名录（如 NRA Show 名录）。
 */
// 展会清单已迁移至 SQLite（seed.ts 的 fairs 集合），支持界面增删改与发现展会。

// 复用「线索采集」的真实搜索凭证
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

// 各展会预置示例展商（模拟模式返回，真实模式由搜索引擎结果覆盖）
const MOCK_EXHIBITORS: Record<string, any[]> = {
  CANTON: [
    { url: 'https://www.creamchargetech.com', title: 'Guangzhou CreamTech Co., Ltd', desc: '奶油枪与 N2O 奶油充电器出口工厂，OEM/ODM', city: '广州', country: 'CN', hasProduct: true },
    { url: 'https://www.whipmaster.cn', title: 'Foshan WhipMaster Co., Ltd', desc: '专业奶油枪、打奶器制造商，出口欧美', city: '佛山', country: 'CN', hasProduct: true },
    { url: 'https://www.n2osolutions.com', title: 'Shenzhen N2O Solutions', desc: '食品级气体与奶油充电器供应商', city: '深圳', country: 'CN', hasProduct: true },
    { url: 'https://www.deliwhip.com', title: 'Zhongshan DeliWhip', desc: '甜品设备与奶油枪贴牌工厂', city: '中山', country: 'CN', hasProduct: true },
    { url: 'https://www.dessertpro.cn', title: 'Hangzhou DessertPro', desc: '餐饮甜品设备与耗材出口商', city: '杭州', country: 'CN', hasProduct: true },
  ],
  NRA: [
    { url: 'https://www.usfoodserviceequip.com', title: 'US FoodService Equip', desc: '餐饮设备与奶油枪批发商', city: 'Chicago, IL', country: 'US', hasProduct: true },
    { url: 'https://www.chicagowholesalecream.com', title: 'Chicago Wholesale Cream', desc: '奶油充电器与甜品耗材分销商', city: 'Chicago, IL', country: 'US', hasProduct: true },
    { url: 'https://www.greatlakeshosp.com', title: 'GreatLakes Hospitality', desc: '酒店餐饮设备供应商', city: 'Milwaukee, WI', country: 'US', hasProduct: true },
    { url: 'https://www.midwestcatering.com', title: 'Midwest Catering Supply', desc: '餐饮服务与设备批发', city: 'Indianapolis, IN', country: 'US', hasProduct: true },
  ],
  ANUGA: [
    { url: 'https://www.berlinfeinkost.de', title: 'Berlin Feinkost GmbH', desc: '德国食品进口与分销', city: 'Berlin', country: 'DE', hasProduct: true },
    { url: 'https://www.eurodeli.nl', title: 'EuroDeli BV', desc: '荷兰食品批发商', city: 'Amsterdam', country: 'NL', hasProduct: true },
    { url: 'https://www.parisgourmet.fr', title: 'Paris Gourmet SA', desc: '法国精品食品进口商', city: 'Paris', country: 'FR', hasProduct: true },
  ],
  HOST: [
    { url: 'https://www.milanocatering.it', title: 'Milano Catering Srl', desc: '意大利餐饮设备品牌', city: 'Milan', country: 'IT', hasProduct: true },
    { url: 'https://www.romahospitality.it', title: 'Roma Hospitality Group', desc: '酒店餐饮设备供应商', city: 'Rome', country: 'IT', hasProduct: true },
    { url: 'https://www.torinofoodtech.it', title: 'Torino FoodTech', desc: '食品设备制造商', city: 'Turin', country: 'IT', hasProduct: true },
  ],
  GULFOOD: [
    { url: 'https://www.dubaiimport.ae', title: 'Dubai Import LLC', desc: '阿联酋食品进口商', city: 'Dubai', country: 'AE', hasProduct: true },
    { url: 'https://www.gulffoodtraders.ae', title: 'Gulf Food Traders', desc: '海湾食品经销商', city: 'Dubai', country: 'AE', hasProduct: true },
    { url: 'https://www.emirateswholesale.ae', title: 'Emirates Wholesale', desc: '阿布扎比食品批发', city: 'Abu Dhabi', country: 'AE', hasProduct: true },
  ],
  FHA: [
    { url: 'https://www.sgfbsupply.sg', title: 'Singapore F&B Supply', desc: '新加坡餐饮供应', city: 'Singapore', country: 'SG', hasProduct: true },
    { url: 'https://www.asiacatering.sg', title: 'Asia Catering Pte', desc: '亚太餐饮设备分销商', city: 'Singapore', country: 'SG', hasProduct: true },
  ],
  IFFA: [
    { url: 'https://www.frankfurtmeattech.de', title: 'Frankfurt MeatTech', desc: '肉类加工设备制造商', city: 'Frankfurt', country: 'DE', hasProduct: true },
    { url: 'https://www.bavariafoodmach.de', title: 'Bavaria FoodMach', desc: '巴伐利亚食品机械', city: 'Munich', country: 'DE', hasProduct: true },
  ],
};

@Injectable()
class ExpoService {
  constructor(
    private db: DbService,
    @Optional() private http: HttpService,
  ) {}

  fairs() {
    const list = (this.db.db as any).fairs || [];
    return list.map((f: any) => ({ ...f, isOngoing: this.isOngoing(f) }));
  }

  private isOngoing(f: any): boolean {
    if (!f?.dateStart || !f?.dateEnd) return false;
    const now = new Date();
    const start = new Date(`${f.dateStart}T00:00:00`);
    const end = new Date(`${f.dateEnd}T23:59:59`);
    return now >= start && now <= end;
  }

  private getFair(id: string) {
    return ((this.db.db as any).fairs || []).find((f: any) => f.id === id);
  }

  createFair(body: any) {
    const fairs = (this.db.db as any).fairs || ((this.db.db as any).fairs = []);
    const base = String(body.enName || body.name || '').trim();
    const id = base
      ? base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : this.db.genId('FAIR');
    if (fairs.some((f: any) => f.id === id)) throw new BadRequestException('展会 ID 已存在');
    const fair = {
      id,
      name: body.name || body.enName || id,
      enName: body.enName || body.name || id,
      region: body.region || '',
      industry: body.industry || '',
      city: body.city || '',
      country: body.country || '',
      website: body.website || '',
      period: body.period || '',
      dateStart: body.dateStart || '',
      dateEnd: body.dateEnd || '',
      fetchable: body.fetchable !== false,
      note: body.note || '',
      productHints: Array.isArray(body.productHints)
        ? body.productHints.map((h: any) => String(h).trim()).filter(Boolean)
        : [],
    };
    fairs.push(fair);
    this.db.save();
    return fair;
  }

  updateFair(id: string, body: any) {
    const fairs = (this.db.db as any).fairs || [];
    const idx = fairs.findIndex((f: any) => f.id === id);
    if (idx < 0) throw new BadRequestException('展会不存在');
    const upd: any = { ...fairs[idx], ...body, id: fairs[idx].id };
    if (Array.isArray(body.productHints)) {
      upd.productHints = body.productHints.map((h: any) => String(h).trim()).filter(Boolean);
    }
    fairs[idx] = upd;
    this.db.save();
    return upd;
  }

  deleteFair(id: string) {
    const fairs = (this.db.db as any).fairs || [];
    const before = fairs.length;
    (this.db.db as any).fairs = fairs.filter((f: any) => f.id !== id);
    this.db.save();
    return { deleted: before - (this.db.db as any).fairs.length };
  }

  provider() {
    const provider = DISCOVER_PROVIDER;
    if (provider === 'google') {
      const missing: string[] = [];
      if (!GOOGLE_CSE_KEY) missing.push('GOOGLE_CSE_KEY');
      if (!GOOGLE_CSE_CX) missing.push('GOOGLE_CSE_CX');
      return { provider, label: 'Google CSE', configured: missing.length === 0, missing };
    }
    if (provider === 'serp') {
      const missing: string[] = [];
      if (!SERP_API_KEY) missing.push('SERP_API_KEY');
      return { provider, label: 'SerpAPI', configured: missing.length === 0, missing };
    }
    return { provider: 'mock', label: '模拟数据', configured: true, missing: [] };
  }

  /** 全部可用数据源及凭证齐备情况，供前端下拉选择 */
  providers() {
    const list: any[] = [
      { provider: 'google', label: 'Google CSE', configured: !!(GOOGLE_CSE_KEY && GOOGLE_CSE_CX), missing: [] },
      { provider: 'serp', label: 'SerpAPI', configured: !!SERP_API_KEY, missing: [] },
      { provider: 'mock', label: '模拟数据', configured: true, missing: [] },
    ];
    if (!GOOGLE_CSE_KEY) list[0].missing.push('GOOGLE_CSE_KEY');
    if (!GOOGLE_CSE_CX) list[0].missing.push('GOOGLE_CSE_CX');
    if (!SERP_API_KEY) list[1].missing = ['SERP_API_KEY'];
    return list;
  }

  /** 读取某展会的同类判定关键词（用户自定义优先，回退默认） */
  private getHints(fairId: string): string[] {
    const settings: any = (this.db.db as any).settings || {};
    const custom = settings.expoHints?.[fairId];
    const fair = this.getFair(fairId);
    return Array.isArray(custom) ? custom : (fair?.productHints || []);
  }

  /** 返回某展会的同类判定关键词（含默认与是否自定义），供前端编辑 */
  hints(q: any) {
    const fair = this.getFair(q?.fairId);
    if (!fair) throw new BadRequestException('请选择展会');
    const settings: any = (this.db.db as any).settings || {};
    const custom = settings.expoHints?.[fair.id];
    return {
      fairId: fair.id,
      fairName: fair.name,
      hints: Array.isArray(custom) ? custom : (fair.productHints || []),
      isCustom: Array.isArray(custom),
      default: fair.productHints || [],
    };
  }

  /** 保存某展会自定义的同类判定关键词（持久化于 settings.expoHints） */
  saveHints(body: any) {
    const fair = this.getFair(body?.fairId);
    if (!fair) throw new BadRequestException('请选择展会');
    const hints = Array.isArray(body?.hints)
      ? body.hints.map((h: any) => String(h).trim()).filter(Boolean)
      : [];
    const settings: any = (this.db.db as any).settings || {};
    settings.expoHints = settings.expoHints || {};
    settings.expoHints[fair.id] = hints;
    (this.db.db as any).settings = settings;
    this.db.save();
    return { fairId: fair.id, hints, saved: true };
  }

  async exhibitors(q: any) {
    const fair = this.getFair(q?.fairId);
    if (!fair) throw new BadRequestException('请选择展会');
    const reqMode = String(q?.mode || '').toLowerCase();
    const mode =
      reqMode === 'mock' ? 'mock'
      : reqMode === 'google' || reqMode === 'serp' ? reqMode
      : DISCOVER_PROVIDER;
    const syntax = this.buildSyntax(fair);
    let raw: any[];
    if (mode === 'mock' || !this.http) {
      raw = MOCK_EXHIBITORS[fair.id] || [];
    } else {
      try {
        raw = await this.fetchLive(syntax, mode, fair);
      } catch (e: any) {
        throw new BadRequestException(`展会展商拉取失败：${e?.message || '未知错误'}`);
      }
    }
    const results = raw.map((r, i) => this.scoreItem(r, i, fair, syntax));
    return { fairId: fair.id, fairName: fair.name, syntax, sourceLabel: fair.name, results };
  }

  /** 以展会官网域名限定，检索参展商 / 展商主页 */
  private buildSyntax(fair: ExpoFair): string {
    let site = '';
    try {
      site = new URL(fair.website).hostname.replace('www.', '');
    } catch {
      site = fair.website;
    }
    return `("${fair.enName}" OR exhibitor OR 展商) site:${site}`;
  }

  private scoreItem(r: any, idx: number, fair: ExpoFair, syntax: string) {
    const domain = (() => {
      try {
        return new URL(r.url).hostname.replace('www.', '');
      } catch {
        return '';
      }
    })();
    const email = r.email || deriveEmail(domain);
    const hints = this.getHints(fair.id);
    const check1 = r.hasProduct
      ? true
      : hints.some((h) => `${r.title} ${r.desc || ''}`.toLowerCase().includes(h.toLowerCase()));
    const checks = {
      check1,
      check2: !!email,
      check3: !!(r.city || r.country),
    };
    const passCount = [checks.check1, checks.check2, checks.check3].filter(Boolean).length;
    const score = 40 + passCount * 20 + Math.round(Math.random() * 8);
    return {
      id: `EXP_${fair.id}_${idx}`,
      url: r.url,
      title: r.title,
      desc: r.desc || '',
      city: r.city || '',
      country: r.country || fair.country,
      domain,
      email,
      fairId: fair.id,
      sourceLabel: fair.name,
      syntax,
      checks,
      passCount,
      score: Math.min(98, score),
      grade: score >= 80 ? 'A' : score >= 60 ? 'B' : 'C',
    };
  }

  /** 把选中的展商批量导入为线索（source=expo） */
  import(body: any) {
    const fair = this.getFair(body?.fairId) || ({ name: '展会名录' } as any);
    const records = Array.isArray(body.records) ? body.records : [];
    const created: any[] = [];
    for (const r of records) {
      const companyName = String(r.companyName || r.title || '').trim();
      if (!companyName) continue;
      let domain = String(r.domain || '').trim();
      if (!domain && r.url) {
        try {
          domain = new URL(r.url).hostname.replace('www.', '');
        } catch {
          /* ignore */
        }
      }
      if (!domain && r.email) domain = String(r.email).split('@')[1] || '';
      const email = r.email || deriveEmail(domain);
      const score = r.score ?? 72;
      const lead: any = {
        id: this.db.genId('L'),
        companyName,
        domain,
        source: 'expo',
        sourceNote: `展会名录 · ${fair.name}`,
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

  /** 半自动发现展会：按关键词搜索候选展会官网 */
  async discoverFairs(q: any) {
    const kw = String(q?.q || '').trim();
    if (!kw) throw new BadRequestException('请输入展会关键词');
    const reqMode = String(q?.mode || '').toLowerCase();
    const mode = reqMode === 'google' || reqMode === 'serp' ? reqMode : DISCOVER_PROVIDER;
    if (mode !== 'google' && mode !== 'serp') {
      throw new BadRequestException('发现展会需配置 Google CSE 或 SerpAPI 凭证（server/.env 的 DISCOVER_PROVIDER）');
    }
    const syntax = `${kw} (trade show OR exhibition OR "exhibitor list") official website`;
    try {
      const items = await this.searchWeb(syntax, mode);
      return items.map((it) => ({ title: it.title, url: it.link, snippet: it.snippet }));
    } catch (e: any) {
      throw new BadRequestException(`展会发现失败：${e?.message || '未知错误'}`);
    }
  }

  /** 通用网页搜索：优先 Google CSE，其次 SerpAPI（复用线索采集凭证） */
  private async searchWeb(query: string, mode: string) {
    if (mode === 'google') {
      const missing: string[] = [];
      if (!GOOGLE_CSE_KEY) missing.push('GOOGLE_CSE_KEY');
      if (!GOOGLE_CSE_CX) missing.push('GOOGLE_CSE_CX');
      if (missing.length) throw new Error(`缺少凭证 ${missing.join('、')}，请在 server/.env 配置`);
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_KEY}&cx=${GOOGLE_CSE_CX}&q=${encodeURIComponent(query)}&num=10`;
      const res = await firstValueFrom(this.http.get(url));
      const items = res.data.items || [];
      return items.map((it: any) => ({ title: it.title, link: it.link, snippet: it.snippet || '' }));
    }
    if (mode === 'serp') {
      if (!SERP_API_KEY) throw new Error('缺少凭证 SERP_API_KEY，请在 server/.env 配置');
      const url = `https://serpapi.com/search.json?api_key=${SERP_API_KEY}&engine=google&q=${encodeURIComponent(query)}&num=10`;
      const res = await firstValueFrom(this.http.get(url));
      const items = res.data.organic_results || [];
      return items.map((it: any) => ({ title: it.title, link: it.link, snippet: it.snippet || '' }));
    }
    throw new Error(`未知数据源 provider=${mode}：请在 server/.env 将 DISCOVER_PROVIDER 设为 google、serp 或 mock`);
  }

  /** 真实拉取：以展会官网域名限定，检索参展商 / 展商主页 */
  private async fetchLive(syntax: string, mode: string, fair: ExpoFair) {
    const items = await this.searchWeb(syntax, mode);
    return items.map((it) => {
      const domain = (() => {
        try {
          return new URL(it.link).hostname.replace('www.', '');
        } catch {
          return '';
        }
      })();
      return {
        url: it.link,
        title: it.title,
        desc: it.snippet,
        city: '',
        country: fair.country,
        email: deriveEmail(domain),
        hasProduct: false,
      };
    });
  }
}

@Controller('expo')
export class ExpoController {
  constructor(private svc: ExpoService) {}
  @Get('fairs') fairs() {
    return this.svc.fairs();
  }
  @Post('fairs') createFair(@Body() b: any) {
    return this.svc.createFair(b);
  }
  @Put('fairs/:id') updateFair(@Param('id') id: string, @Body() b: any) {
    return this.svc.updateFair(id, b);
  }
  @Delete('fairs/:id') deleteFair(@Param('id') id: string) {
    return this.svc.deleteFair(id);
  }
  @Get('discover') discoverFairs(@Query() q: any) {
    return this.svc.discoverFairs(q);
  }
  @Get('provider') provider() {
    return this.svc.provider();
  }
  @Get('providers') providers() {
    return this.svc.providers();
  }
  @Get('hints') hints(@Query() q: any) {
    return this.svc.hints(q);
  }
  @Post('hints') saveHints(@Body() b: any) {
    return this.svc.saveHints(b);
  }
  @Get('exhibitors') exhibitors(@Query() q: any) {
    return this.svc.exhibitors(q);
  }
  @Post('import') importData(@Body() b: any) {
    return this.svc.import(b);
  }
}

@Module({
  imports: [HttpModule],
  controllers: [ExpoController],
  providers: [ExpoService],
})
export class ExpoModule {}
