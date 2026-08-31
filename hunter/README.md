# B2B 寻客系统（Hunter）MVP 原型

基于《B2B寻客系统产品功能文档（PRD）》搭建的 MVP 原型，技术栈：

- **前端**：Vue 3 + TypeScript + Vite + Element Plus + Pinia + ECharts
- **后端**：NestJS + TypeScript（JSON 文件持久化，零数据库依赖，便于原型演示）
- **部署**：Docker Compose 就绪（后续可切换 PostgreSQL）

## 目录结构

```
hunter/
├── server/            # NestJS 后端（端口 3000）
│   ├── src/
│   │   ├── db/        # JSON 文件持久化 + 种子数据
│   │   ├── leads/     # 线索管理
│   │   ├── discover/  # 线索采集（Google 搜索模拟）
│   │   ├── companies/ # 客户/联系人/商机/时间线
│   │   ├── mail/      # 邮件模板/发送/记录（含禁词拦截）
│   │   ├── compliance/# 合规文档库/禁词库
│   │   ├── keywords/  # 关键词库/否定词库
│   │   ├── analytics/ # 看板与漏斗
│   │   └── dashboard/ # 工作台
│   └── data/db.json   # 运行时数据（自动生成）
└── web/               # Vue3 前端（端口 5173）
    └── src/
        ├── layouts/   # 主框架
        └── views/     # 10 个核心页面
```

## 快速启动

前置要求：Node.js ≥ 18

```bash
# 方式一：根目录一键启动（需安装 concurrently）
npm run install:all
npm run dev

# 方式二：分开启动
cd server && npm install && npm run start:dev
cd web && npm install && npm run dev
```

- 后端 API：http://localhost:3000/api/health
- 前端页面：http://localhost:5173 （已配置 /api 代理到后端）

## 功能覆盖（对应 PRD）

| 模块 | 页面 | 覆盖功能 |
|---|---|---|
| 工作台 | `/dashboard` | 目标进度、待办、待跟进、未读回复 |
| 线索采集 | `/discover` | 预置搜索语法、三标准校验、入库 |
| 线索池 | `/leads` | 评分/筛选/去重/转客户 |
| 客户 | `/customers`、`/customers/:id` | 档案/联系人/时间线/商机/地图标签 |
| 邮件 | `/mail` | 模板、变量预览、禁词拦截、频控、发送记录 |
| 合规 | `/compliance` | 文档库、禁词库、检查清单 |
| 关键词 | `/keywords` | B端词库、否定词库 |
| 看板 | `/analytics` | 邮件漏斗、转化漏斗、渠道分析、KPI |
| 系统 | `/settings` | 集成配置、权限说明 |

## 注意事项

- 原型使用 JSON 文件存储，重启数据保留在 `server/data/db.json`；
- 禁词扫描默认含 recreational、whip gas 等红线词（见合规模块）；
- 邮件发送为模拟流程（不发真实邮件），展示完整业务链路。

## 接入真实数据源（Discover 模块）

线索采集默认使用模拟数据。要接入真实搜索，在 `server/.env` 配置（参考 `server/.env.example`）：

```ini
# 数据源：mock（默认）| google | serp
DISCOVER_PROVIDER=google
# Google Custom Search JSON API（provider=google 时必填）
GOOGLE_CSE_KEY=你的KEY
GOOGLE_CSE_CX=你的CX
# 或 SerpAPI（provider=serp 时必填）：SERP_API_KEY=你的KEY
```

- 配置真实凭证后，前端 `/discover` 自动切换到「真实搜索」模式，三标准校验基于真实结果判定：
  - check1 在售同类：页面标题/摘要含 `cream charger` 等产品关键词；
  - check2 真实邮箱：从站点域名派生 `sales@/info@/contact@` 并做格式校验；
  - check3 地图可定位：结果含城市/地址信息。
- 未配置或调用失败时，后端**自动降级为模拟数据**并返回 `degraded:true`，前端提示且不中断流程。
- 环境变量通过 `main.ts` 零依赖加载（无需额外 dotenv 依赖）。`.env` 已被 `.gitignore` 忽略，凭证不会入库。

## 接入真实邮件服务（MailCenter 模块）

开发信默认模拟发送（不实际投递）。要启用真实发送，在 `server/.env` 配置（参考 `server/.env.example`）：

```ini
# 通道：mock（默认）| smtp
MAIL_PROVIDER=smtp
MAIL_FROM=sales@smileiceqi.com
# 任意 SMTP 服务（企业邮箱 / Amazon SES / SendGrid 均可）
MAIL_SMTP_HOST=smtp.example.com
MAIL_SMTP_PORT=587
MAIL_SMTP_USER=你的账号
MAIL_SMTP_PASS=你的密码
```

- 配置后，`/mail/send` 通过 nodemailer 实际投递，记录 `status` 置为 `delivered`；发送失败置为 `failed`，不中断其他收件人。
- 禁词拦截、每日 50 封配额、合规文档自动附随逻辑在真实通道下同样生效。
- 投递状态回写：`POST /mail/webhook { id, event: 'opened'|'replied'|'failed' }` 供真实服务商 webhook 接入；前端在真实模式下提供「已打开 / 已回复」演示按钮，便于闭环演示。
- 前端实时显示数据源模式（模拟 / SMTP）。
