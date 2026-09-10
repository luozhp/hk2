# Google Ads 广告投放模块 · 功能说明与业务流程

> **所属产品**：B2B 寻客系统（代号 Hunter）
> **文档版本**：V1.0
> **编写日期**：2026-09-01
> **关联文档**：《B2B寻客系统产品功能文档》（模块 F：广告管理 F-F-01~05）、《美国B2B客户开发产品文档》（§5.2 Google Ads 搜索广告）
> **文档状态**：设计稿（待评审）

---

## 目录

1. [结论摘要](#1-结论摘要)
2. [现状盘点（代码事实）](#2-现状盘点代码事实)
3. [能力分级与可行性评估](#3-能力分级与可行性评估)
4. [功能设计](#4-功能设计)
5. [业务流程 SOP](#5-业务流程-sop)
6. [指标口径与决策阈值](#6-指标口径与决策阈值)
7. [权限矩阵](#7-权限矩阵)
8. [分阶段实施计划](#8-分阶段实施计划)
9. [风险与依赖](#9-风险与依赖)
10. [附录](#10-附录)

---

## 1. 结论摘要

**可以加。** 但建议**分三层递进落地**，不要一上来就对接 Google Ads API：

| 层级 | 能力 | 外部依赖 | 开发量 | 建议 |
|---|---|---|---|---|
| **L1 广告台账** | 计划配置 + 数据手工/CSV 录入 + 归因 + 看板 | 无 | 1–2 天 | ✅ **立即做** |
| **L2 报表导入** | Google Ads 后台报表 CSV 解析入库 | 无（人工导出） | +1 天 | ✅ 紧随 L1 |
| **L3 API 直连** | 定时同步花费/点击/转化，gclid 级归因 | 开发者令牌（需 Google 审批 1–2 周） | 3–5 天 | ⏸ 等 L1/L2 跑顺再评估 |

**核心理由**：API 直连需要 Google Ads **开发者令牌（Developer Token）**，申请有门槛（需有效 Google Ads 账号 + 符合 API 政策 + 审批周期），而这套系统当前真正的缺口是**"广告花了多少钱、换来多少询盘、哪个词值"没有地方记录**——这个缺口靠 L1 就能补齐，且不需要任何外部审批。先把归因闭环建起来，等广告跑出数据量、确认值得投入，再申请 API 也不迟。

---

## 2. 现状盘点（代码事实）

### 2.1 已有的（可直接复用）

| 资产 | 位置 | 现状 |
|---|---|---|
| 广告计划集合 | `server/src/db/seed.ts` → `adCampaigns` | 有数据模型定义与 1 条种子数据（AD001） |
| 否定词库 | `keywords` 模块 `/api/keywords/negative` | 4 条种子（whip charger / whip gas / recreational / whip it），P0 已实现 |
| 关键词库 | `/api/keywords` | 6 条种子，含核心词/长尾词、落地页归属、排名与状态 |
| 落地页清单 | `/api/landing-pages` | `/wholesale`、`/oem`，含承载词数统计 |
| 询盘归因 | `/api/inquiries` | 含 `sourceChannel` / `attributedKeyword` / `landingPage` 三要素 |
| 看板渠道贡献 | `/api/analytics/channels` | 已按 `inquiries.sourceChannel` 统计，**渠道值 `ads` 已预留** |
| 合规扫描 | `/api/compliance/scan` | 违禁词检测，可复用于广告文案上线前自检 |
| 配置范式 | `server/.env.example` | 已有 `DISCOVER_*` / `MAIL_*` 分模块范式，新增 `ADS_*` 风格一致 |

### 2.2 缺失的

1. **无后端模块**：`server/src` 下没有 ads 相关模块，`adCampaigns` 只是躺在数据库里的种子数据，没有任何读写接口。
2. **前端是假数据**：`web/src/views/Keywords.vue` 里广告卡片为硬编码：

   ```ts
   adCampaigns.value = [
     { id: 'AD001', name: 'US 批发关键词（测试）', budgetDaily: 40, spent: 320, clicks: 18, ctr: 0.145, conversions: 1, status: 'paused' },
   ];
   ```

3. **无日粒度数据**：只有汇总数字，无法看趋势、无法定位是哪天/哪个词烧钱。
4. **无归因回写**：询盘无法关联到具体广告计划（缺 `campaignId` / `gclid` 字段）。
5. **无否定词同步导出**（F-F-02，PRD 定为 P0）：否定词库已有，但没有一键导出给投放系统的出口。

### 2.3 与 PRD 模块 F 的对照

| 编号 | 功能 | 优先级 | 当前状态 |
|---|---|---|---|
| F-F-01 | 广告计划配置（日预算 $30–50 模板、广告组、关键词） | P1 | ❌ 未实现（仅种子数据） |
| F-F-02 | 否定词同步（一键导出否定词清单） | P0 | ❌ 未实现 |
| F-F-03 | 广告数据接入（API 或手动导入曝光/点击/花费/CTR/CPC） | P1 | ❌ 未实现 |
| F-F-04 | 询盘-广告归因（询盘标记来源，统计获客成本） | P2 | ⚠️ 字段已备（`sourceChannel='ads'`），无录入界面 |
| F-F-05 | Shopping 商品管理（气弹标记"仅 B 端询盘，不做零售"） | P2 | ❌ 未实现 |

---

## 3. 能力分级与可行性评估

### 3.1 L1 · 广告台账（无外部依赖）

- **做什么**：广告计划增删改查、日粒度数据录入、CSV 导入、询盘归因、看板接入、否定词导出。
- **依赖**：无。纯系统内部功能。
- **价值**：把"投了什么、花了多少、换来几条询盘"变成可查询、可复盘的数据资产。
- **风险**：数据靠人工录入，存在滞后——但对 $30–50/天的小预算测试而言，每日/每周录入一次完全够用。

### 3.2 L2 · 报表 CSV 导入（无外部依赖）

- **做什么**：Google Ads 后台 → 广告系列/关键词报表 → 导出 CSV → 系统解析入库（自动字段映射 + 按日期去重覆盖）。
- **依赖**：无。运营每周导出一次即可。
- **价值**：消除手工录入误差，粒度可到关键词级，这才是"判断哪个词值得投"的关键数据。
- **风险**：CSV 列名随 Google Ads 界面语言/版本变化，需做模糊匹配映射（见附录 10.2）。

### 3.3 L3 · Google Ads API 直连（有外部门槛）

**接入条件**：

| 项目 | 说明 |
|---|---|
| 开发者令牌 | 需 Google Ads 经理账号（MCC）申请；基础访问（Basic）可自用，标准访问（Standard）需提交申请与审核，周期通常 1–2 周 |
| OAuth2 凭证 | Google Cloud Console 创建 OAuth 客户端，换取 refresh token |
| 客户 ID | 10 位 Google Ads 客户 ID（去横线），MCC 场景需额外 `login-customer-id` |
| 客户端库 | Node 无官方客户端，社区主流为 `google-ads-api`（Opteo 维护，当前对应 Google Ads API **v25**，2026-07 发布） |
| 配额 | 基础访问存在每日操作数上限，小账户日常同步（每日 1–2 次）远远够用 |
| 费用 | API 本身免费，但要求账号有实际投放消耗 |

**结论**：技术上完全可行，**瓶颈在审批周期而非代码**。建议 L1/L2 稳定运行、确认广告投放是长期动作后再启动申请。

---

## 4. 功能设计

### 4.1 数据模型

**`adCampaigns`（扩展现有集合，向后兼容）**

```ts
{
  id: 'AD001',
  name: 'US 批发关键词（测试）',
  channel: 'google-ads',          // 预留 Bing / Meta
  type: 'search',                 // search | shopping
  status: 'draft',                // draft | running | paused | ended（状态机见 4.4）
  customerId: null,               // Google Ads 客户 ID（L3 同步后回填）
  campaignId: null,               // Google Ads 计划 ID（CSV/API 同步后回填）
  budgetDaily: 40,                // 日预算（USD）
  budgetMonthlyCap: 1200,         // 月预算上限（防失控，触发自动告警）
  bidStrategy: 'manual-cpc',      // manual-cpc | maximize-clicks | maximize-conversions
  targetGeo: ['US'],              // 投放地区
  language: 'en',
  landingPage: '/wholesale',      // 关联落地页清单
  keywords: ['cream charger wholesale', 'n2o charger supplier'],
  negativeKeywords: ['whip charger', 'whip gas'],   // 与否定词库联动，可一键同步
  startDate: '2026-08-12',
  endDate: null,
  owner: 'u2',
  // —— 汇总指标（由 adDailyStats 聚合，或 CSV/API 覆盖写入）——
  impressions: 12400, clicks: 18, spent: 320, conversions: 1,
}
```

**`adDailyStats`（新增，日粒度）**

```ts
{
  id: 'ADS_xxx', campaignId: 'AD001', date: '2026-09-01',
  impressions: 860, clicks: 12, spent: 28.4, conversions: 0,
  source: 'manual',               // manual | csv | api（数据来源，便于排错）
}
```

**`adKeywords`（新增，关键词级表现，L2 起启用）**

```ts
{
  id: 'ADK_xxx', campaignId: 'AD001', date: '2026-09-01',
  keyword: 'cream charger wholesale', matchType: 'phrase',
  impressions: 320, clicks: 5, spent: 11.2, conversions: 0,
  avgPosition: 2.4,
}
```

**`inquiries`（扩展归因字段）**

```ts
{ ..., sourceChannel: 'ads', campaignId: 'AD001', attributedKeyword: 'cream charger wholesale',
  landingPage: '/wholesale', gclid: 'CjwKCAiA...' }   // gclid 为 L3 点击级归因准备
```

### 4.2 与现有模块的关系

```
关键词库（选词）──┐
                 ├──► 广告计划（adCampaigns）──► 日粒度数据（adDailyStats）
否定词库（合规）──┘                │                      │
                                  │                      ▼
落地页清单 ───────────────────────┤            指标汇总（CTR/CPC/CPA）
                                  │                      │
                                  ▼                      ▼
                          询盘归因（inquiries）──► 数据看板「渠道贡献」
                                  ▲
                    合规扫描（compliance/scan）校验广告文案
```

### 4.3 接口清单

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/ad-campaigns` | 计划列表（附汇总指标与预算执行率） |
| POST | `/api/ad-campaigns` | 新建计划（自动带入否定词库 as 默认否定词） |
| PUT | `/api/ad-campaigns/:id` | 编辑计划（含状态流转） |
| DELETE | `/api/ad-campaigns/:id` | 删除计划（连带清理日粒度数据） |
| POST | `/api/ad-campaigns/:id/stats` | 录入/覆盖某日数据（按 date 去重） |
| GET | `/api/ad-campaigns/:id/stats` | 日粒度趋势（供前端绘图） |
| POST | `/api/ad-campaigns/import` | CSV 导入（支持计划级与关键词级报表） |
| GET | `/api/ad-campaigns/summary` | 看板汇总：总花费、询盘数、CPA、渠道占比 |
| GET | `/api/ad-campaigns/negative-export` | **F-F-02**：导出否定词清单（文本/CSV，供 Google Ads 批量导入） |
| POST | `/api/ad-campaigns/sync` | **L3**：调用 Google Ads API 同步（未配置凭证时返回友好降级提示） |

> 降级策略沿用系统现有约定（参考 `DiscoverModule` / `MailModule`）：`ADS_PROVIDER=mock|manual|api`，未配置凭证时不报错、返回提示，保证系统可用。

### 4.4 计划状态机

```
draft ──(上线检查清单通过)──► running ──(手动/超预算)──► paused ──► running
  │                              │
  │                              └──(复盘结论：停止投放)──► ended
  └──(废弃)──► ended
```

- 仅 `running` 状态计入看板"投放中"统计与预算告警
- 状态变更写入 `activities`（客户动态）或直接留痕在计划字段，便于追溯谁在什么时候调整了什么

### 4.5 前端页面（新增「广告管理」`/ads`）

1. **概览卡**：本月花费 / 询盘数 / CPA / 预算执行率（进度条，超 80% 变橙、超 100% 变红）
2. **计划卡片列表**：计划名、状态标签、日预算、累计花费、点击、CTR、询盘、CPA、快捷操作（暂停/编辑/录入数据）
3. **趋势图**：ECharts 双轴柱线组合（柱=每日花费，线=每日询盘），沿用数据看板视觉语言
4. **关键词明细表**：展示量 / 点击 / 花费 / 询盘，**"有点击无询盘"的行标红**——这是优化的直接抓手
5. **归因询盘列表**：该计划带来的询盘（联动 `inquiries`）
6. **否定词同步区**：一键复制/导出否定词清单（F-F-02 出口）

### 4.6 合规联动（硬性要求）

- 新建计划时**强制从否定词库带入全部 `all` 与 `google-ads` 渠道的否定词**，且不允许清空（吸食相关词 `whip charger` / `whip gas` / `whip it` / `recreational` / `inhalation` 为红线）
- 广告文案保存前调用 `/api/compliance/scan` 自检，命中违禁词直接拦截
- 计划表单标注：气弹**仅 B 端询盘，不做零售一件代发**（《美国B2B客户开发产品文档》§5.3）
- 落地页字段必填，且必须指向已在落地页清单中**状态为「已上线」**的页面

---

## 5. 业务流程 SOP

### 5.1 建计划流程（上线前）

```
① 选词（关键词库）
   └ 取 B 端采购意图词：产品词 + wholesale/supplier/manufacturer/bulk/OEM/private label + USA
   └ 初期以长尾词为主（约 7 成），核心词 1–2 个即可（竞争贵、转化慢）

② 分组（广告组）
   └ 一个广告组 = 一组意图相同的词（与落地页清单的分组规则保持一致）
   └ 例：组 A「wholesale/bulk」→ /wholesale；组 B「OEM/private label」→ /oem

③ 加否定词（合规红线，先加后投）
   └ 系统：计划表单一键同步否定词库
   └ 后台：粘贴/导入到 Google Ads 否定关键词列表（词组匹配 + 广泛匹配各加一遍）

④ 定落地页
   └ 批量询价意图 → /wholesale；贴牌代工意图 → /oem
   └ 页面必须含：合规资质（MSDS / UN-DOT）、MOQ 与阶梯报价、邮箱 + 表单 + WhatsApp

⑤ 设预算与出价
   └ 日预算 $30–50（PRD 模板值），月预算上限建议 = 日预算 × 30
   └ 初期 manual-cpc 或 maximize-clicks，出价保守起步

⑥ 上线检查清单（全部通过才可置为 running）
   ☐ 否定词已同步（含吸食相关词）
   ☐ 落地页已上线且手机端可访问
   ☐ 转化追踪已配置（表单提交 / 询盘邮件）
   ☐ 地理位置限定 US，语言 English
   ☐ 广告文案已过合规扫描
   ☐ 付款方式正常、无欠费
   ☐ 月预算上限已设置（防失控）
```

### 5.2 投放期节奏

| 频率 | 动作 | 产出 |
|---|---|---|
| **每日** | 看花费与预算执行率；检查搜索词报告有无垃圾词 | 发现异常立即加否定词 |
| **每周** | ① 导出 Google Ads 报表 → CSV 导入系统 ② 新出现的无关搜索词补进否定词库 ③ 登记本周询盘并归因到计划/关键词 | 系统内数据更新到日粒度 |
| **每月** | ① 按 6.2 决策表调整出价与预算 ② 关停低效词、补新词 ③ 对比 SEO 自然询盘，判断广告是否值得继续 | 下月投放计划 |
| **每季** | 复盘 CPA 与成交转化，结论同步到数据看板「渠道贡献」，决定是否放量或换渠道 | 季度复盘结论 |

### 5.3 复盘决策流程

```
导出报表 → 导入系统 → 看关键词明细 →
   ├─ 有点击无询盘且花费高 → 查落地页（资质/报价是否首屏可见）→ 改页面 or 暂停该词
   ├─ 有询盘且 CPA 达标   → 加词 / 提预算（每次 +20~30%，不翻倍）
   ├─ 有询盘但 CPA 超标   → 降出价 / 收紧匹配 / 优化落地页
   └─ 无点击              → 提价或换词（展示量低）；展示高点击低 → 改创意
```

### 5.4 关停与归档

- 触发**暂停**：连续 7 天 0 询盘且累计花费 > $100；或月花费达上限 100%
- 触发**结束**：季度复盘判定该渠道 ROI 不达标，或预算转向其他渠道
- 归档动作：状态置 `ended`，保留日粒度数据至少 12 个月，计划卡片从"投放中"移入"历史"

---

## 6. 指标口径与决策阈值

### 6.1 指标定义

| 指标 | 公式 | 说明 |
|---|---|---|
| CTR（点击率） | 点击 ÷ 展示 | < 2% 说明创意与搜索意图不匹配 |
| CPC（单次点击成本） | 花费 ÷ 点击 | 美国 B2B 关键词常见 $1–5，超过 $5 需重点审视 |
| CVR（询盘转化率） | 询盘 ÷ 点击 | 落地页质量的直接体现 |
| CPA（单询盘成本） | 花费 ÷ 询盘 | **本系统最核心指标**，与"有效客户成本"挂钩 |
| 预算执行率 | 当日花费 ÷ 日预算 | ≥100% 当天已撞线，≥80% 预警 |

**归因窗口建议**：点击后 **30 天**、浏览后 **1 天**（B2B 决策周期长，可按实际调整）；系统内以"询盘创建时间归属到最近一次广告点击"为兜底规则。

### 6.2 决策阈值表

| 现象 | 判定 | 动作 |
|---|---|---|
| 展示高、CTR < 2% | 创意不相关 | 改标题/描述，突出 wholesale、MOQ、food-grade |
| 点击 ≥ 15 次且 0 询盘 | 落地页或意图不匹配 | 检查落地页资质与报价入口；无效则暂停该词 |
| 搜索词出现吸食相关词 | **合规红线** | 立即加否定词（词组 + 广泛），检查账号状态 |
| CPC 持续 > $5 且 0 询盘 | 词太贵或不精准 | 降出价 / 转长尾词 / 收紧匹配类型 |
| 单询盘成本 > 目标 CPA × 2 | 效率不达标 | 暂停该词，保留预算给高效词 |
| 连续 7 天 0 询盘且花费 > $100 | 计划整体无效 | 暂停计划，回到选词与落地页重做 |
| CPA ≤ 目标且稳定 2 周 | 可放量 | 日预算 +20~30%（**不要一次翻倍**，会重置学习期） |
| 月花费达上限 100% | 预算撞线 | 系统告警，需管理者审批是否追加 |

> 目标 CPA 建议初始设为 **$80–120 / 询盘**（按 $30–50/天预算、B2B 询盘价值反推），跑满一个月后用实际数据校准。

---

## 7. 权限矩阵

| 角色 | 广告计划 | 数据录入/导入 | 预算调整 | 状态变更 | 查看 |
|---|---|---|---|---|---|
| 业务员（sales） | — | — | — | — | ✅ 只读 |
| 运营专员（operator） | ✅ 增删改 | ✅ | ≤ $50/天 自助 | ✅ | ✅ |
| 管理者（admin） | ✅ | ✅ | ✅ 无上限（> $50/天 需审批） | ✅ | ✅ |

---

## 8. 分阶段实施计划

| 阶段 | 内容 | 交付物 | 工作量 | 外部依赖 |
|---|---|---|---|---|
| **阶段一（L1）** | `ad-campaigns` 后端模块（CRUD + 日粒度 + 汇总 + 否定词导出）；「广告管理」页面；询盘归因扩展 `campaignId`；看板接入 | 可用模块 + 页面 | 1–2 天 | 无 |
| **阶段二（L2）** | CSV 报表导入（计划级 + 关键词级）、字段模糊映射、按日期去重覆盖 | 导入功能 + 模板 | +1 天 | 无 |
| **阶段三（L3）** | Google Ads API 直连：OAuth、定时同步、gclid 级归因、转化回传 | API 同步任务 | 3–5 天 | 开发者令牌（审批 1–2 周） |
| **阶段四** | Shopping 商品管理（F-F-05）：气弹标记"仅 B 端询盘" | 商品清单 | 1–2 天 | 无 |

**建议**：先做阶段一 + 阶段二，跑满一个投放月后，用真实 CPA 数据决定是否值得投入阶段三。

---

## 9. 风险与依赖

| 风险 | 影响 | 应对 |
|---|---|---|
| **开发者令牌审批周期长/被拒** | L3 无法上线 | L1/L2 不依赖 API，功能不受阻 |
| **合规风险（吸食关联词）** | 广告账号被封，损失全部投放资产 | 否定词强制同步 + 上线检查清单 + 文案合规扫描 |
| **预算失控** | 超支 | 月预算上限 + 预算执行率告警（80%/100% 双档） |
| **归因误差** | CPA 算不准，决策失真 | 统一归因窗口；gclid 埋点（阶段三）；询盘必填来源渠道 |
| **CSV 列名变动** | 导入失败 | 模糊匹配 + 导入预览 + 失败行提示，不静默丢弃 |
| **数据录入滞后** | 复盘依据过时 | 固定每周一导入上周数据，纳入运营 SOP |
| **气弹品类的广告政策限制** | 部分广告被拒登 | 广告文案走 B 端餐饮场景表述（foodservice / culinary），避开敏感联想；投放前用小预算试投观察审核结果 |

---

## 10. 附录

### 10.1 配置项设计（`server/.env`）

沿用现有 `DISCOVER_*` / `MAIL_*` 分模块风格：

```ini
# ---------- 广告投放（Ads 模块）----------
# 数据源类型：mock（默认，演示数据）| manual（手工/CSV 录入）| api（Google Ads API 直连）
ADS_PROVIDER=manual
# 以下仅 provider=api 时需要（阶段三启用）
# Google Ads API 开发者令牌（MCC 账号申请）
ADS_DEVELOPER_TOKEN=
# OAuth2 客户端（Google Cloud Console）
ADS_CLIENT_ID=
ADS_CLIENT_SECRET=
# OAuth2 刷新令牌
ADS_REFRESH_TOKEN=
# Google Ads 客户 ID（10 位，去横线）
ADS_CUSTOMER_ID=
# MCC 经理账号 ID（若通过 MCC 访问子账号）
ADS_LOGIN_CUSTOMER_ID=
# 同步频率（每日几点同步，默认 03:00）
ADS_SYNC_CRON=0 3 * * *
# 月预算告警阈值（百分比，默认 80）
ADS_BUDGET_ALERT_PCT=80
```

> 未配置凭证时接口返回降级提示（"当前为手工录入模式，配置凭证后可启用自动同步"），系统照常可用。

### 10.2 CSV 报表字段映射

Google Ads 后台导出的报表列名随语言/版本变化，采用**模糊匹配 + 手动确认**：

| 系统字段 | Google Ads 报表常见列名（中/英） |
|---|---|
| date | 日期 / Day / Date |
| campaignId | 广告系列 ID / Campaign ID |
| campaignName | 广告系列 / Campaign |
| keyword | 关键字 / Keyword / Search keyword |
| matchType | 匹配类型 / Match type |
| impressions | 展示次数 / Impressions |
| clicks | 点击次数 / Clicks |
| spent | 费用 / Cost / Spend |
| conversions | 转化次数 / Conversions |
| avgPosition | 平均排名 / Avg. position |

**导入规则**：按 `campaignId + date (+ keyword)` 唯一键**覆盖**（幂等，重复导入不会产生重复数据）；导入前提供预览，显示"新增 X 条 / 覆盖 Y 条 / 跳过 Z 条"。

### 10.3 Google Ads API 申请步骤（阶段三用）

1. 准备 Google Ads 账号（有实际投放记录更易通过）
2. 申请 MCC 经理账号（manager account）
3. 在 MCC 中申请**开发者令牌**（Developer Token），先获基础访问权限
4. Google Cloud Console 创建 OAuth 2.0 客户端（Desktop app 类型）
5. 用 OAuth 换取 **refresh token**（需 `https://www.googleapis.com/auth/adwords` 权限范围）
6. 填写 `ADS_*` 配置项并重启后端，调用 `/api/ad-campaigns/sync` 验证连通性
7. 若需访问多客户账号或提升配额，提交**标准访问（Standard Access）**申请并等待审批

### 10.4 否定词导出格式（F-F-02）

导出为 Google Ads「批量上传」兼容的两列文本，可直接粘贴到编辑器：

```
Keyword, Match Type, Campaign
whip charger, Negative Phrase, US 批发关键词（测试）
whip gas, Negative Phrase, US 批发关键词（测试）
recreational, Negative Broad, US 批发关键词（测试）
```

---

## 修订记录

| 版本 | 日期 | 修订人 | 修订说明 |
|---|---|---|---|
| V1.0 | 2026-09-01 | — | 初稿：现状盘点、能力分级、功能设计、业务流程 SOP、分阶段计划 |
