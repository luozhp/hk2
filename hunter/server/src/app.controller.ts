import { Controller, Get, Post } from '@nestjs/common';
import { DbService } from './db/db.service';
import { Public, Roles } from './auth/auth.guard';

@Controller()
export class AppController {
  constructor(private db: DbService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', service: 'hunter-server', time: new Date().toISOString() };
  }

  // 整库重置属于高危操作：仅管理员可调用（此前为公开接口，任何人可清空数据）
  @Roles('admin')
  @Post('reset')
  reset() {
    this.db.reset();
    return { ok: true, message: '数据已重置为初始状态' };
  }
}
