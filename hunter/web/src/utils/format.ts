/**
 * 统一格式化与映射工具。
 *
 * 背景：各页面此前各自实现日期格式化与等级/类型映射，
 * 行为与时区处理不一致（如有的显示 YYYY-MM-DD、有的显示 M/D、有的空值返回 '' 有的返回 '—'）。
 * 这里收敛为单一实现，新代码直接引用；旧页面可渐进迁移。
 */

/** 日期 → YYYY-MM-DD（空值返回 —） */
export const fmtDate = (v: any): string => (v ? String(v).slice(0, 10) : '—');

/** 日期时间 → YYYY-MM-DD HH:mm（空值返回 —） */
export const fmtDateTime = (v: any): string => {
  if (!v) return '—';
  const s = String(v);
  return s.length > 10 ? `${s.slice(0, 10)} ${s.slice(11, 16)}` : s.slice(0, 10);
};

/** 日期 → M/D（本地时区，用于时间线等简短展示） */
export const fmtMonthDay = (v: any): string => {
  if (!v) return '';
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(v));
};

/** 评分等级 → Element Tag 类型 */
export const gradeType = (g: string): string =>
  ({ A: 'success', B: 'warning', C: 'info' } as any)[g] || 'info';
