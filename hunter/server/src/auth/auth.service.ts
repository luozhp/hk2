import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DbService } from '../db/db.service';
import { JWT_SECRET, JWT_EXPIRES_IN, DEFAULT_PASSWORD } from './auth.constants';

@Injectable()
export class AuthService {
  constructor(
    private db: DbService,
    private jwt: JwtService,
  ) {}

  /** 登录：校验邮箱 + 密码，签发 JWT */
  async login(email: string, password: string) {
    const user = this.db.db.users.find(
      (u: any) => u.email?.toLowerCase() === (email || '').toLowerCase(),
    );
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('邮箱或密码错误');
    }
    if (user.status === 'disabled') {
      throw new UnauthorizedException('账号已被停用，请联系管理员');
    }
    const ok = await bcrypt.compare(password || '', user.passwordHash);
    if (!ok) throw new UnauthorizedException('邮箱或密码错误');

    const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
    const token = await this.jwt.signAsync(payload, {
      secret: JWT_SECRET,
      expiresIn: JWT_EXPIRES_IN,
    });
    return { token, user: this.sanitize(user) };
  }

  /** 当前用户信息（不含密码） */
  me(userId: string) {
    const user = this.db.db.users.find((u: any) => u.id === userId);
    if (!user) throw new NotFoundException('用户不存在');
    return this.sanitize(user);
  }

  /** 修改自己的密码 */
  changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = this.db.db.users.find((u: any) => u.id === userId);
    if (!user) throw new NotFoundException('用户不存在');
    if (!bcrypt.compareSync(oldPassword || '', user.passwordHash)) {
      throw new BadRequestException('原密码不正确');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('新密码长度至少 6 位');
    }
    user.passwordHash = bcrypt.hashSync(newPassword, 10);
    this.db.save();
    return { ok: true, message: '密码已更新' };
  }

  /** 用户列表（管理员）：脱敏 */
  users() {
    return this.db.db.users.map((u: any) => ({
      ...this.sanitize(u),
      status: u.status || 'active',
    }));
  }

  /** 创建用户（管理员） */
  createUser(body: any) {
    if (!body.email || !body.name) throw new BadRequestException('邮箱与姓名为必填');
    // 邮箱统一小写：否则可创建 A@x.com 与 a@x.com 两个账号，且后者永远登不上
    const email = String(body.email || '').trim().toLowerCase();
    if (this.db.db.users.some((u: any) => String(u.email || '').toLowerCase() === email)) {
      throw new BadRequestException('该邮箱已存在');
    }
    const user = {
      id: this.db.genId('U'),
      name: body.name,
      email,
      role: body.role || 'sales',
      status: 'active',
      passwordHash: bcrypt.hashSync(body.password || DEFAULT_PASSWORD, 10),
      createdAt: new Date().toISOString(),
    };
    this.db.db.users.push(user);
    this.db.save();
    return this.sanitize(user);
  }

  /** 管理员重置某用户密码 */
  resetPassword(userId: string) {
    const user = this.db.db.users.find((u: any) => u.id === userId);
    if (!user) throw new NotFoundException('用户不存在');
    user.passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
    this.db.save();
    return { ok: true, message: `密码已重置为默认密码` };
  }

  /** 启用/停用用户（管理员） */
  toggleStatus(userId: string, status: string) {
    const user = this.db.db.users.find((u: any) => u.id === userId);
    if (!user) throw new NotFoundException('用户不存在');
    if (user.role === 'admin') throw new BadRequestException('不能停用管理员账号');
    user.status = status === 'disabled' ? 'disabled' : 'active';
    this.db.save();
    return this.sanitize(user);
  }

  private sanitize(u: any) {
    const { passwordHash, ...rest } = u;
    return rest;
  }
}
