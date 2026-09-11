# 独立站询盘对接指南（Vue 前端）

> 面向自研独立站（Vue 3）开发者的对接手册：把独立站的询盘表单接入「寻客系统」，实现「独立站 → 询盘 → 看板」自动归因闭环。
>
> 适用版本：Hunter v1.0.0 及以上（含公开询盘接口 `POST /api/public/inquiry`）。

---

## 1. 方案概述

### 1.1 对接链路

```
独立站浏览器表单
      │  ① 前端采集归因（UTM / 落地页 / 关键词），提交到独立站自己的后端
      ▼
独立站服务端  /api/inquiry
      │  ② 带站点密钥（x-site-key）转发，密钥只存服务端环境变量
      ▼
寻客系统  POST /api/public/inquiry
      │  ③ 写入询盘池，按 sourceChannel / attributedKeyword / landingPage 归因
      ▼
询盘管理 + 数据看板「渠道贡献」
```

### 1.2 为什么不让前端直连

站点密钥若写在前端 JS 中，任何人查看源码即可获取并伪造询盘灌入系统。因此**推荐由独立站后端代理转发**，密钥保存在服务端环境变量，浏览器完全接触不到。

> 若不介意密钥暴露（内部/测试环境），也可前端直连，见第 6.3 节。

---

## 2. 前置准备

1. 登录寻客系统 → **系统设置 → 独立站询盘回传**
2. 复制：
   - **站点密钥**（形如 `sk_276477e4...`）→ 配置到独立站服务端环境变量 `HUNTER_SITE_KEY`
   - **接口地址**（形如 `https://你的系统域名/api/public/inquiry`）→ 配置到 `HUNTER_API`
3. 确认已在「关键词库 → 落地页清单」登记过独立站页面路径（如 `/wholesale`、`/oem`），路径需与前端采集的 `landingPage` 一致，归因才能对上。

> 站点密钥在「系统设置」首次打开时自动生成；点击「重置」会立即失效旧密钥，已上线的表单需同步更新。

---

## 3. 接口说明

### 3.1 基本信息

| 项目 | 说明 |
|---|---|
| 方法 | `POST` |
| 路径 | `/api/public/inquiry` |
| 鉴权 | 请求头 `x-site-key`（免登录，`@Public()` 接口） |
| 内容类型 | `application/json` |
| 跨域 | 服务端已开启 CORS（`origin: true`），可跨域调用 |

### 3.2 请求头

```
Content-Type: application/json
x-site-key: sk_xxxxxxxxxxxxxxxx
```

### 3.3 请求体字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `content` | ✅ | 询盘内容。建议把公司名、需求、来源一起拼进去 |
| `contactEmail` | ➖ | 联系邮箱，便于后续查重 / 建档 |
| `sourceChannel` | ➖ | 来源渠道，取值：`seo` / `ads` / `platform` / `email` / `referral`；非法值兜底为 `seo` |
| `attributedKeyword` | ➖ | 归因关键词，用于看板渠道归因 |
| `landingPage` | ➖ | 落地页路径，如 `/wholesale` |

请求示例：

```json
{
  "content": "Company: ABC Food Supply\nMessage: Need 5000 pcs cream chargers, target market US\nSource: google/cpc/summer",
  "contactEmail": "buyer@example.com",
  "sourceChannel": "ads",
  "attributedKeyword": "cream charger wholesale USA",
  "landingPage": "/wholesale"
}
```

### 3.4 响应

成功（200）：

```json
{ "ok": true, "id": "I_1789030443097_hv1y3h" }
```

错误：

| 状态码 | 含义 | 处理 |
|---|---|---|
| `401` | 站点密钥无效或缺失 | 检查 `x-site-key` 与设置页密钥是否一致 |
| `400` | `content` 为空 | 前端补必填校验 |
| `502` | 独立站后端转发失败 | 检查 `HUNTER_API` 可达性 |

### 3.5 sourceChannel 取值

| 值 | 场景 | 看板展示 |
|---|---|---|
| `seo` | 自然搜索 / 直接访问（默认） | 独立站自然流量 |
| `ads` | Google / Bing 付费广告 | 付费广告 |
| `platform` | B2B 平台询盘 | 平台 |
| `email` | 邮件引发的询盘 | 邮件 |
| `referral` | 转介绍 / 社媒（LinkedIn 等） | 推荐 |

---

## 4. 前端实现（Vue 3）

> 以下为**零额外依赖**实现（仅用 Vue 3 + 原生 fetch）。如项目已用 VueUse，可自行改用 `useStorage`。

### 4.1 归因采集 composable

`src/composables/useAttribution.ts`

```ts
export interface Attribution {
  landingPage: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  keyword: string;
  referrer: string;
}

const KEY = 'hunter_attr';
const MAX_AGE = 60 * 60 * 24 * 90; // 90 天

const EMPTY = (): Attribution => ({
  landingPage: window.location.pathname,
  utmSource: '', utmMedium: '', utmCampaign: '', keyword: '', referrer: '',
});

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

/** 首次落地即记录来源；带 UTM 时覆盖（以最新广告点击为准） */
export function captureAttribution(): Attribution {
  const q = new URLSearchParams(window.location.search);
  const data: Attribution = {
    landingPage: window.location.pathname,
    utmSource: q.get('utm_source') || '',
    utmMedium: q.get('utm_medium') || '',
    utmCampaign: q.get('utm_campaign') || '',
    keyword: q.get('kw') || q.get('utm_term') || '',
    referrer: document.referrer || '',
  };
  if (data.utmSource || !readCookie(KEY)) {
    document.cookie = `${KEY}=${encodeURIComponent(JSON.stringify(data))};path=/;max-age=${MAX_AGE};SameSite=Lax`;
  }
  return getAttribution();
}

export function getAttribution(): Attribution {
  const raw = readCookie(KEY);
  if (!raw) return EMPTY();
  try {
    return { ...EMPTY(), ...(JSON.parse(raw) as Attribution) };
  } catch {
    return EMPTY();
  }
}

/** 映射到寻客系统的 sourceChannel 取值（seo/ads/platform/email/referral） */
export function mapSourceChannel(a: Attribution): 'seo' | 'ads' | 'platform' | 'email' | 'referral' {
  const s = a.utmSource.toLowerCase();
  const m = a.utmMedium.toLowerCase();
  if ((s.includes('google') || s.includes('bing')) && /(cpc|ppc|ads)/.test(m)) return 'ads';
  if (s.includes('ads')) return 'ads';
  if (s.includes('email')) return 'email';
  if (s.includes('linkedin')) return 'referral';
  return 'seo';
}
```

### 4.2 询盘表单组件

`src/components/InquiryForm.vue`

```vue
<script setup lang="ts">
import { reactive, ref } from 'vue';
import { captureAttribution, getAttribution, mapSourceChannel } from '@/composables/useAttribution';

const form = reactive({ company: '', email: '', message: '' });
const submitting = ref(false);
const done = ref(false);
const error = ref('');

// 组件出现即采集（用户在表单页直接落地的情况）
captureAttribution();

async function onSubmit() {
  error.value = '';
  if (!form.message.trim()) { error.value = '请填写需求内容'; return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { error.value = '请填写有效的邮箱'; return; }

  const attr = getAttribution();
  const payload = {
    content:
      `Company: ${form.company || '-'}\n` +
      `Message: ${form.message}\n` +
      `Source: ${attr.utmSource || attr.referrer || 'direct'}/${attr.utmMedium || '-'}` +
      (attr.utmCampaign ? `/${attr.utmCampaign}` : ''),
    contactEmail: form.email.trim(),
    sourceChannel: mapSourceChannel(attr),
    attributedKeyword: attr.keyword || null,
    landingPage: attr.landingPage || window.location.pathname,
  };

  submitting.value = true;
  try {
    // 打到你独立站自己的后端（由它带 x-site-key 转发，密钥不暴露给浏览器）
    const res = await fetch('/api/inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    done.value = true;
    form.company = '';
    form.email = '';
    form.message = '';
  } catch {
    error.value = '提交失败，请稍后重试或直接邮件联系我们';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form class="inquiry-form" @submit.prevent="onSubmit">
    <h3>Get a quote</h3>
    <p v-if="done" class="ok">✓ 已提交，我们会尽快联系你</p>
    <template v-else>
      <input v-model="form.company" placeholder="Company" autocomplete="organization" />
      <input v-model="form.email" type="email" placeholder="Work email *" autocomplete="email" required />
      <textarea v-model="form.message" rows="4"
        placeholder="Tell us what you need (product, quantity, target market) *" required />
      <p v-if="error" class="err">{{ error }}</p>
      <button type="submit" :disabled="submitting">
        {{ submitting ? 'Sending…' : 'Send inquiry' }}
      </button>
    </template>
  </form>
</template>

<style scoped>
.inquiry-form { display: flex; flex-direction: column; gap: 12px; max-width: 420px; }
.inquiry-form h3 { margin: 0; font-size: 18px; }
.inquiry-form input, .inquiry-form textarea {
  padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font: inherit; outline: none;
}
.inquiry-form input:focus, .inquiry-form textarea:focus { border-color: #2563eb; }
.inquiry-form button {
  padding: 11px 16px; border: 0; border-radius: 8px; background: #2563eb; color: #fff;
  font-weight: 600; cursor: pointer;
}
.inquiry-form button:disabled { opacity: .6; cursor: not-allowed; }
.ok { color: #16a34a; font-size: 14px; }
.err { color: #dc2626; font-size: 13px; margin: 0; }
</style>
```

### 4.3 全局采集（重要）

只在表单组件里采集，会漏掉「从广告落地页进入 → 浏览多页后才提交」的情况。建议在 `main.ts` 全局调用一次：

```ts
// src/main.ts
import { createApp } from 'vue';
import { captureAttribution } from './composables/useAttribution';
import App from './App.vue';

captureAttribution(); // 每个访问者首次落地即记录来源到 cookie
createApp(App).mount('#app');
```

### 4.4 放置位置

把 `<InquiryForm />` 放到 `/wholesale`、`/oem` 以及「联系我们」页即可。

> 这些路径需与寻客系统「关键词库 → 落地页清单」登记的一致，归因才能正确对到页面。

---

## 5. 后端代理（独立站服务端）

前端提交到独立站自己的 `/api/inquiry`，由服务端带密钥转发。

### 5.1 Node / Express

```js
// 环境变量：HUNTER_API=https://你的寻客系统域名  HUNTER_SITE_KEY=sk_xxx
app.post('/api/inquiry', async (req, res) => {
  const b = req.body || {};
  if (!b.content || !b.contactEmail) return res.status(400).json({ ok: false, message: '缺少内容或邮箱' });

  try {
    const r = await fetch(`${process.env.HUNTER_API}/api/public/inquiry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-site-key': process.env.HUNTER_SITE_KEY,
      },
      body: JSON.stringify({
        content: b.content,
        contactEmail: b.contactEmail,
        sourceChannel: b.sourceChannel || 'seo',
        attributedKeyword: b.attributedKeyword || null,
        landingPage: b.landingPage || null,
      }),
    });
    res.status(r.status).json(await r.json().catch(() => ({})));
  } catch {
    res.status(502).json({ ok: false, message: '转发失败' });
  }
});
```

### 5.2 其他语言

把上面的 `fetch` 换成对应语言的 HTTP 请求即可：

- **PHP**：
  ```php
  $ch = curl_init(getenv('HUNTER_API') . '/api/public/inquiry');
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
      'Content-Type: application/json',
      'x-site-key: ' . getenv('HUNTER_SITE_KEY'),
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
  ]);
  $result = curl_exec($ch);
  ```
- **Python（requests）**：
  ```python
  import os, requests
  r = requests.post(
      os.environ['HUNTER_API'] + '/api/public/inquiry',
      json=payload,
      headers={'x-site-key': os.environ['HUNTER_SITE_KEY']},
  )
  ```

---

## 6. 归因机制说明

### 6.1 采集与存储

- 访问者首次落地时，把 `landingPage / utm_* / kw / referrer` 写入 cookie `hunter_attr`，有效期 90 天。
- 之后带 UTM 参数再次进入时**覆盖**（以最新一次广告点击为准）；否则保留首次落地记录。
- 表单提交时读取 cookie，并映射为系统字段。

### 6.2 UTM 与来源映射

| URL 参数 | 系统字段 | 备注 |
|---|---|---|
| `utm_source` + `utm_medium=cpc/ppc/ads` | `sourceChannel=ads` | Google / Bing 广告 |
| `utm_source=email` | `sourceChannel=email` | 邮件 |
| `utm_source=linkedin` | `sourceChannel=referral` | 社媒 / 转介绍 |
| 无 UTM（自然/直接） | `sourceChannel=seo` | 默认 |
| `kw` 或 `utm_term` | `attributedKeyword` | 关键词归因 |
| 当前路径 | `landingPage` | 需与落地页清单一致 |

### 6.3 前端直连（不推荐）

若确需前端直连（跳过独立站后端），把组件中的 `fetch('/api/inquiry')` 改为直连系统地址并带头：

```ts
const res = await fetch('https://你的系统域名/api/public/inquiry', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-site-key': 'sk_xxx' }, // ⚠️ 密钥会暴露
  body: JSON.stringify(payload),
});
```

> 风险：密钥公开，可被伪造询盘。仅限内网或测试环境。

---

## 7. 测试与排查

### 7.1 自测步骤

1. 访问 `https://你的独立站/wholesale?utm_source=google&utm_medium=cpc&kw=test`，提交一条表单。
2. 登录寻客系统 → **询盘管理**：应出现该条询盘，`landingPage=/wholesale`、来源为「付费广告」。
3. 打开 **数据看板 → 渠道贡献**：对应渠道计数 +1。

### 7.2 常见问题

| 现象 | 原因 | 排查 |
|---|---|---|
| 返回 401 | 密钥不符 | 核对设置页密钥与 `HUNTER_SITE_KEY`；是否点过「重置」 |
| 返回 400 | `content` 为空 | 检查前端必填校验与拼装逻辑 |
| 返回 502 | 独立站后端转发失败 | 检查服务器能否访问 `HUNTER_API` 域名、DNS、防火墙 |
| 询盘进去了但没有归因 | `landingPage`/关键词为空 | 检查 cookie `hunter_attr` 是否写入；全局是否调用了 `captureAttribution()` |
| 浏览器控制台 CORS 报错 | 走前端直连 | 服务端 CORS 已开启；若仍报错请改走服务端代理 |

---

## 8. 安全建议

1. **密钥只存服务端环境变量**，不要提交进 Git、不要写在前端。
2. 独立站后端转发前做**基础校验与限流**（校验必填、对同 IP 简单频控），防止被刷。
3. 定期在设置页**轮换密钥**（重置后同步更新 `HUNTER_SITE_KEY`）。
4. 询盘内容会被拼入 `content` 字段，避免拼接未经处理的富文本/HTML。

---

## 附录：字段映射速查表

| 独立站字段 | 系统字段 | 必填 | 示例 |
|---|---|---|---|
| 表单内容拼装 | `content` | ✅ | `Company: ABC\nMessage: ...\nSource: google/cpc` |
| 邮箱 | `contactEmail` | ➖ | `buyer@example.com` |
| UTM 映射 | `sourceChannel` | ➖ | `ads` |
| `kw` / `utm_term` | `attributedKeyword` | ➖ | `cream charger wholesale USA` |
| 落地页路径 | `landingPage` | ➖ | `/wholesale` |
