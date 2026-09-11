import { BadRequestException } from '@nestjs/common';

/**
 * 轻量入参校验工具（零依赖）。
 *
 * 背景：本项目未引入 class-validator / DTO，所有接口入参都是 `body: any`，
 * 非法输入（缺字段、枚举越界、数值超范围）会一路写进数据库。
 * 这里提供一组小函数，在关键写入口做统一校验，并统一抛 BadRequestException，
 * 使错误响应风格一致（前端拦截器统一提示 message）。
 */

/** 必填字符串 */
export function requireString(value: any, field: string, max = 1000): string {
  const v = String(value ?? '').trim();
  if (!v) throw new BadRequestException(`${field} 必填`);
  if (v.length > max) throw new BadRequestException(`${field} 长度不能超过 ${max}`);
  return v;
}

/** 可选字符串（为空返回兜底值） */
export function optionalString(value: any, fallback = '', max = 2000): string {
  const v = String(value ?? '').trim();
  if (!v) return fallback;
  if (v.length > max) throw new BadRequestException(`字段长度不能超过 ${max}`);
  return v;
}

/** 枚举校验：值必须在允许列表内 */
export function requireEnum<T extends string>(value: any, allowed: readonly T[], field: string): T {
  const v = String(value ?? '').trim();
  if (!allowed.includes(v as T)) {
    throw new BadRequestException(`${field} 取值无效（允许：${allowed.join(' / ')}）`);
  }
  return v as T;
}

/** 可选枚举：为空时用兜底值 */
export function optionalEnum<T extends string>(value: any, allowed: readonly T[], fallback: T, field: string): T {
  const v = String(value ?? '').trim();
  if (!v) return fallback;
  return requireEnum(v, allowed, field);
}

/** 数值范围校验 */
export function optionalNumber(
  value: any,
  field: string,
  min = -Infinity,
  max = Infinity,
  fallback = 0,
): number {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException(`${field} 必须是数字`);
  if (n < min || n > max) throw new BadRequestException(`${field} 需在 ${min} ~ ${max} 之间`);
  return n;
}
