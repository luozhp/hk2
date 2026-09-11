import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * 搜索公共服务（供 discover / directory / expo 复用）。
 *
 * 背景：三处此前各自实现了一套「真实搜索 + 凭证判断 + 邮箱推导」，
 * 常量与逻辑几乎逐字重复（DISCOVER_PROVIDER / GOOGLE_CSE_* / SERP_API_KEY、
 * fetchLive、deriveEmail、EMAIL_RE）。这里收敛为单一实现，
 * 后续新增数据源只需改这一处。
 */

export const SEARCH_PROVIDER = (process.env.DISCOVER_PROVIDER || 'mock').toLowerCase(); // mock | google | serp
const GOOGLE_CSE_KEY = process.env.GOOGLE_CSE_KEY || '';
const GOOGLE_CSE_CX = process.env.GOOGLE_CSE_CX || '';
const SERP_API_KEY = process.env.SERP_API_KEY || '';

/** 邮箱格式校验 */
export const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

/** 依域名推导可能的联系邮箱（仅用于结果展示；入库与真实发送不应直接使用，避免硬退信） */
export function deriveEmail(domain: string): string | null {
  if (!domain) return null;
  const candidates = [`sales@${domain}`, `info@${domain}`, `contact@${domain}`];
  for (const c of candidates) {
    if (EMAIL_RE.test(c)) return c;
  }
  return null;
}

/** 从 URL 取主机名（去 www），非法 URL 返回空串 */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * 执行真实搜索。mode: google | serp，其余抛错。
 * 凭证缺失时抛出可直接展示给用户的友好错误。
 */
export async function searchWeb(http: HttpService, syntax: string, mode: string): Promise<any[]> {
  if (mode === 'google') {
    const missing: string[] = [];
    if (!GOOGLE_CSE_KEY) missing.push('GOOGLE_CSE_KEY');
    if (!GOOGLE_CSE_CX) missing.push('GOOGLE_CSE_CX');
    if (missing.length) {
      throw new Error(`缺少真实搜索凭证：请在 server/.env 配置 ${missing.join('、')}（获取方式见页面“获取凭证”说明）`);
    }
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_KEY}&cx=${GOOGLE_CSE_CX}&q=${encodeURIComponent(syntax)}&num=10`;
    const res = await firstValueFrom(http.get(url));
    const items = res.data.items || [];
    return items.map((it: any) => ({
      url: it.link, title: it.title, desc: it.snippet || '',
      city: '', address: '',
      email: deriveEmail(hostOf(it.link)),
    }));
  }
  if (mode === 'serp') {
    if (!SERP_API_KEY) {
      throw new Error('缺少真实搜索凭证：请在 server/.env 配置 SERP_API_KEY（获取方式见页面“获取凭证”说明）');
    }
    const url = `https://serpapi.com/search.json?api_key=${SERP_API_KEY}&engine=google&q=${encodeURIComponent(syntax)}&num=10`;
    const res = await firstValueFrom(http.get(url));
    const items = res.data.organic_results || [];
    return items.map((it: any) => ({
      url: it.link, title: it.title, desc: it.snippet || '',
      city: it.city || '', address: it.address || '',
      email: deriveEmail(hostOf(it.link)),
    }));
  }
  throw new Error(`未知数据源 provider=${mode}：请在 server/.env 将 DISCOVER_PROVIDER 设为 google、serp 或 mock`);
}

/** 当前搜索通道与凭证状态（供各模块 provider() 接口复用） */
export function searchProviderInfo() {
  const missing: string[] = [];
  if (SEARCH_PROVIDER === 'google') {
    if (!GOOGLE_CSE_KEY) missing.push('GOOGLE_CSE_KEY');
    if (!GOOGLE_CSE_CX) missing.push('GOOGLE_CSE_CX');
  } else if (SEARCH_PROVIDER === 'serp' && !SERP_API_KEY) {
    missing.push('SERP_API_KEY');
  }
  return { provider: SEARCH_PROVIDER, configured: missing.length === 0, missing };
}
