// 认证相关常量。JWT_SECRET 优先从 .env 注入（main.ts 已零依赖加载 .env）。
// 弱密钥占位值：命中即拒绝启动，避免默认密钥被利用伪造 token
const WEAK_SECRET_MARKS = ['change-me', 'please-change', 'hunter-dev-secret'];
const rawSecret = String(process.env.JWT_SECRET || '').trim();
if (!rawSecret || WEAK_SECRET_MARKS.some((m) => rawSecret.toLowerCase().includes(m))) {
  throw new Error(
    'JWT_SECRET 未配置或仍是占位值，已拒绝启动。请执行 `openssl rand -hex 32` 生成强随机串，写入 server/.env 的 JWT_SECRET 后重启。',
  );
}
export const JWT_SECRET = rawSecret;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const JWT_EXPIRES_IN: any = process.env.JWT_EXPIRES_IN || '7d';
export const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'Hunter@123';

// 元数据 key
export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

// 角色定义
export const ROLES = {
  admin: 'admin', // 管理者：全部权限 + 用户管理 + 系统设置
  operator: 'operator', // 运营专员：线索/邮件/合规/广告/看板
  sales: 'sales', // 业务员：本人范围客户与发送
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];
