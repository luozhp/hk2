import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY, ROLES_KEY, JWT_SECRET } from './auth.constants';

/** 标记接口为公开（无需登录） */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** 限制接口可访问角色：@Roles('admin') */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/** 当前登录用户：@CurrentUser() user */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    return data ? user?.[data] : user;
  },
);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('未登录或登录已过期');
    try {
      req.user = await this.jwt.verifyAsync(token, { secret: JWT_SECRET });
    } catch {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }
    return true;
  }

  private extractToken(req: any): string | null {
    const header: string = req.headers?.authorization || '';
    if (header.startsWith('Bearer ')) return header.slice(7);
    return req.headers?.['x-access-token'] || null;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const req = ctx.switchToHttp().getRequest();
    const role = req.user?.role;
    if (!role || !required.includes(role)) {
      throw new ForbiddenException('无权限执行此操作（角色：' + (role || '未知') + '）');
    }
    return true;
  }
}
