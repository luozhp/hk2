# B2B 寻客系统（Hunter）v1.0 正式版

基于《B2B寻客系统产品功能文档（PRD）》实现的可投入使用的正式版，技术栈：

- **前端**：Vue 3 + TypeScript + Vite + Element Plus + Pinia + ECharts
- **后端**：NestJS + TypeScript + SQLite（Node 内置 `node:sqlite`，WAL 模式）
- **认证**：JWT + bcrypt 密码加密 + 角色权限控制（管理者 / 运营专员 / 业务员）
- **部署**：Docker Compose 一键部署（nginx 反代 + 数据卷持久化）

## 目录结构

```
hunter/
├── server/            # NestJS 后端（端口 3000）
│   ├── src/
│   │   ├── db/        # SQLite 持久化层（事务落盘 + 自动备份 + 旧 JSON 迁移）
│   │   ├── auth/      # JWT 认证：登录 / 改密 / 成员管理（角色权限）
│   │   ├── leads/     # 线索管理
│   │   ├── discover/  # 线索采集（Google/SerpAPI 或模拟）
│   │   ├── companies/ # 客户/联系人/商机/时间线
│   │   ├── mail/      # 邮件模板/发送/记录（含禁词拦截、频控）
│   │   ├── compliance/# 合规文档库/禁词库
│   │   ├── keywords/  # 关键词库/否定词库
│   │   ├── analytics/ # 看板与漏斗
│   │   └── dashboard/ # 工作台
│   └── data/          # 运行时数据（hunter.db + backups/ 自动备份）
└── web/               # Vue3 前端（开发端口 5173 / 生产 nginx 80）
    └── src/
        ├── layouts/   # 主框架（含登录守卫、改密）
        ├── stores/    # Pinia（认证态）
        └── views/     # 10 个核心页面 + 登录页
```

## 快速启动（开发）

前置要求：Node.js ≥ 22.5（SQLite 依赖 Node 内置 `node:sqlite`）

```bash
# 方式一：根目录一键启动
npm run install:all
npm run dev

# 方式二：分开启动
cd server && npm install && npm run start:dev
cd web && npm install && npm run dev
```

- 后端 API：http://localhost:3000/api/health
- 前端页面：http://localhost:5173 （已配置 /api 代理到后端）

### 默认账号

| 角色 | 邮箱 | 密码 |
|---|---|---|
| 管理者 | boss@smileiceqi.com | Hunter@123 |
| 运营专员 | ops@smileiceqi.com | Hunter@123 |
| 业务员 | sales@smileiceqi.com | Hunter@123 |

> 首次部署请立即登录后在「系统设置 → 团队与权限」中修改密码（或通过 `.env` 的 `DEFAULT_USER_PASSWORD` 自定义初始密码）。

## 正式版特性

### 数据持久化（SQLite）
- 事务整库落盘，WAL 模式崩溃安全；
- 每次启动自动轮转备份（`server/data/backups/`，默认保留 7 份，`DB_BACKUP_KEEP` 可调）；
- 从原型版 `db.json` 自动迁移（迁移后归档为 `db.json.bak`），老数据平滑升级。

### 认证与权限
- JWT（默认 7 天有效）+ bcrypt 密码加密，全接口守卫；
- 角色权限：管理者（全部 + 成员管理）/ 运营专员（线索、邮件、合规、看板）/ 业务员（本人范围）；
- 登录页、自动携带 Token、401 自动跳转、修改密码。

### 真实数据源（Discover 模块）
在 `server/.env` 配置（参考 `server/.env.example`）：

```ini
# 数据源：mock（默认）| google | serp
DISCOVER_PROVIDER=google
GOOGLE_CSE_KEY=你的KEY
GOOGLE_CSE_CX=你的CX
# 或 SerpAPI（provider=serp 时必填）：SERP_API_KEY=你的KEY
```

未配置或调用失败时自动降级为模拟数据并返回 `degraded:true`，不中断流程。

### 真实邮件（MailCenter 模块）
在 `server/.env` 配置：

```ini
# 通道：mock（默认）| smtp
MAIL_PROVIDER=smtp
MAIL_FROM=sales@smileiceqi.com
MAIL_SMTP_HOST=smtp.example.com
MAIL_SMTP_PORT=587
MAIL_SMTP_USER=你的账号
MAIL_SMTP_PASS=你的密码
```

禁词拦截、每日发送配额（默认 50 封）、合规文档附随逻辑在真实通道下同样生效。
投递状态回写：`POST /mail/webhook { id, event: 'opened'|'replied'|'failed' }` 供服务商 webhook 接入。

### 合规模块（Compliance）
「合规文档库」集中管理出口必需的五类合规文件（页面右上角「说明」弹窗有完整介绍与获取流程）：

| 类型 | 作用 | 获取方式 |
|------|------|----------|
| MSDS（材料安全数据表） | 上架审核、物流申报、清关与客户审核必备 | 向厂家索取，或委托 SGS/TÜV/Intertek 按 GHS 编制 |
| UN（危险品运输编号） | 空/海运订舱与承运人申报，确定包装与标签 | 见 MSDS 第 14 项，对照 IATA DGR / IMDG Code |
| DOT（美国运输部 49 CFR） | 出口美国强制合规：包装标记、标签、运输声明 | 按 49 CFR 172 确定，由货代 / DG 顾问出具 |
| FDA（美国食品药品监管局） | 食品接触材料合规、进口 Prior Notice 预先通报 | 厂家按 21 CFR 出具符合性声明，进口商注册申报 |
| ISO（体系认证） | 海外客户验厂与询盘的信任背书 | 认证机构（SGS/TÜV/BSI/CQC）体系审核 |

- 文档需在有效期内登记使用（页面标记「有效 / 即将到期」），过期会被平台与海关拦截；
- MSDS 与每批货物成分绑定，配方变更即作废旧版本；
- 「禁词库」为全渠道（邮件/广告/落地页/社媒）统一红线扫描，内置文案扫描工具可即时校验。

## 生产部署（Docker Compose）

前置要求：服务器已安装 Docker + Docker Compose。

```bash
# 1. 配置环境变量（务必修改 JWT_SECRET）
cp server/.env.example server/.env
#    编辑 server/.env：JWT_SECRET 改为随机串（openssl rand -hex 32），按需填真实 SMTP / 搜索凭证

# 2. 构建并启动
docker compose up -d --build

# 3. 访问
#    http://服务器IP （nginx :80 → 前端，/api → 后端）
```

- 数据持久化在 Docker 卷 `hunter-data`（`server/data/hunter.db`），重建容器不丢数据；
- 升级流程：`git pull && docker compose up -d --build`；
- 数据备份：`docker run --rm -v hunter-data:/data -v $PWD:/backup alpine tar czf /backup/hunter-backup.tar.gz /data`。

## 常见问题

- **Node 版本**：`node:sqlite` 需 Node ≥ 22.5，开发与 Docker 均已使用 Node 22；Node 22.13+ 可去掉 `NODE_OPTIONS=--experimental-sqlite`。
- **JWT 密钥**：生产环境务必修改 `JWT_SECRET`，否则存在被伪造令牌风险。
- **发信限额**：为避免被判定垃圾邮件，单账号日发送上限默认 50 封（`MAIL_DAILY_LIMIT`），发送间隔 60-120 秒随机。
- **合规红线**：禁词扫描默认含 recreational、whip gas 等红线词（见合规模块）。
