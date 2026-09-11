import { Controller, Get, Query, Module, Injectable, Optional } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DbService } from '../db/db.service';
import { deriveEmail, searchWeb } from '../common/search';

const SYNTAX_PRESETS = [
  { id: 'S1', name: '食品服务分销商', syntax: '"cream charger" OR "cream whipper" foodservice distributor site:.us -alibaba -amazon' },
  { id: 'S2', name: '进口批发商', syntax: '"whipped cream charger" wholesale importer site:.us' },
  { id: 'S3', name: '贴牌品牌', syntax: 'private label cream charger USA distributor site:.us' },
  { id: 'S4', name: '电商批发商', syntax: 'cream charger bulk e-commerce wholesaler site:.us -amazon' },
];

const MOCK_RESULTS = [
  { url: 'https://foodserviceco.com', title: 'FoodserviceCo | Food Service Distributor', desc: 'Wholesale cream chargers, whipping equipment and bakery supplies across California.', city: 'Los Angeles, CA', hasProduct: true, hasEmail: true, hasMap: true },
  { url: 'https://whippedkitchen.com', title: 'Whipped Kitchen Supply', desc: 'Importer of professional kitchen tools including cream whippers.', city: 'Houston, TX', hasProduct: true, hasEmail: true, hasMap: false },
  { url: 'https://creamfactoryinc.com', title: 'Cream Factory Inc | Bakery Equipment', desc: 'Bakery equipment distributor focused on ovens and mixers.', city: 'Chicago, IL', hasProduct: false, hasEmail: true, hasMap: true },
  { url: 'https://dessertwholesale.com', title: 'Dessert Wholesale Co', desc: 'Wholesale dessert ingredients and whipped cream chargers for cafés.', city: 'Portland, OR', hasProduct: true, hasEmail: true, hasMap: true },
  { url: 'https://gourmetgasusa.com', title: 'Gourmet Gas USA', desc: 'Culinary gas solutions and food-grade chargers for the foodservice industry.', city: 'Denver, CO', hasProduct: true, hasEmail: false, hasMap: true },
  { url: 'https://coffeewholesale.net', title: 'Coffee Wholesale Network', desc: 'Coffee shop supply distributor, serving specialty cafés nationwide.', city: 'Seattle, WA', hasProduct: true, hasEmail: true, hasMap: true },
];

// 真实数据源配置（通过环境变量注入，未配置时回退 mock）
const DISCOVER_PROVIDER = (process.env.DISCOVER_PROVIDER || 'mock').toLowerCase(); // mock | google | serp
const GOOGLE_CSE_KEY = process.env.GOOGLE_CSE_KEY || '';
const GOOGLE_CSE_CX = process.env.GOOGLE_CSE_CX || '';
const SERP_API_KEY = process.env.SERP_API_KEY || '';

// 在售同类产品关键词（用于 check1 判定）
const PRODUCT_HINTS = ['cream charger', 'cream whipper', 'whipped cream charger', 'n2o charger', 'whipping charger'];
// 真实邮箱格式校验（排除 info@/sales@ 等通用但要求 domain 与站点一致）
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

// deriveEmail 已抽取到 common/search（三个采集模块共用）

// 用真实页面文本/摘要判定是否在售同类（check1）
function checkHasProduct(text: string): boolean {
  const t = (text || '').toLowerCase();
  return PRODUCT_HINTS.some((h) => t.includes(h));
}

// 地图可定位（check3）：真实结果含 city/state 或地址时视为可定位
function checkHasMap(city?: string, address?: string): boolean {
  return !!(city || address);
}

@Injectable()
class DiscoverService {
  constructor(
    private db: DbService,
    @Optional() private http: HttpService,
  ) {}

  presets() { return SYNTAX_PRESETS; }

  /** 返回数据源状态与凭证齐备情况，供前端提示"如何获取凭证" */
  provider() {
    const provider = DISCOVER_PROVIDER;
    if (provider === 'google') {
      const missing: string[] = [];
      if (!GOOGLE_CSE_KEY) missing.push('GOOGLE_CSE_KEY');
      if (!GOOGLE_CSE_CX) missing.push('GOOGLE_CSE_CX');
      return {
        provider,
        label: 'Google CSE',
        configured: missing.length === 0,
        missing,
      };
    }
    if (provider === 'serp') {
      const missing: string[] = [];
      if (!SERP_API_KEY) missing.push('SERP_API_KEY');
      return {
        provider,
        label: 'SerpAPI',
        configured: missing.length === 0,
        missing,
      };
    }
    return { provider: 'mock', label: '模拟数据', configured: true, missing: [] };
  }

  async execute(query: any) {
    const syntax = query.syntax || '';
    const requested = (query.mode || '').toLowerCase();
    // live 为前端通用标识，归一化为 .env 中配置的真实数据源
    const mode = requested === 'live' ? DISCOVER_PROVIDER : requested || DISCOVER_PROVIDER;
    if (mode === 'mock' || !this.http) {
      return this.scoreMock(syntax, mode);
    }
    try {
      const raw = await this.fetchLive(syntax, mode);
      return raw.map((r, i) => {
        const checks = {
          check1: checkHasProduct(`${r.title} ${r.desc}`),
          check2: !!r.email,
          check3: checkHasMap(r.city, r.address),
        };
        const passCount = [checks.check1, checks.check2, checks.check3].filter(Boolean).length;
        const score = 40 + passCount * 20 + (Math.round(Math.random() * 10));
        return {
          id: `SR_${i}`,
          url: r.url, title: r.title, desc: r.desc, city: r.city || '',
          syntax, checks, passCount,
          grade: score >= 80 ? 'A' : score >= 60 ? 'B' : 'C',
          score: Math.min(98, score),
          hasProduct: checks.check1, hasEmail: checks.check2, hasMap: checks.check3,
        };
      });
    } catch (e: any) {
      // 真实搜索失败时降级到 mock，保证原型流程不中断
      return { degraded: true, reason: e?.message || 'live fetch failed', data: this.scoreMock(syntax, 'mock') };
    }
  }

  private scoreMock(syntax: string, mode: string) {
    return MOCK_RESULTS.map((r, i) => {
      const checks = { check1: r.hasProduct, check2: r.hasEmail, check3: r.hasMap };
      const passCount = [checks.check1, checks.check2, checks.check3].filter(Boolean).length;
      const score = 40 + passCount * 20 + (Math.round(Math.random() * 10));
      return {
        id: `SR_${i}`, ...r, syntax, checks, passCount,
        grade: score >= 80 ? 'A' : score >= 60 ? 'B' : 'C',
        score: Math.min(98, score),
      };
    });
  }

  // 真实搜索委托给公共服务：discover / directory / expo 共用同一套实现与凭证判断
  private async fetchLive(syntax: string, mode: string) {
    return searchWeb(this.http, syntax, mode);
  }
}

@Controller('discover')
export class DiscoverController {
  constructor(private svc: DiscoverService) {}
  @Get('presets') presets() { return this.svc.presets(); }
  @Get('provider') provider() { return this.svc.provider(); }
  @Get('execute') execute(@Query() q: any) { return this.svc.execute(q); }
}

@Module({
  imports: [HttpModule],
  controllers: [DiscoverController],
  providers: [DiscoverService],
})
export class DiscoverModule {}
