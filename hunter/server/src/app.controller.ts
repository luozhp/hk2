import { Controller, Get, Post } from '@nestjs/common';
import { DbService } from './db/db.service';
import { Public } from './auth/auth.guard';

@Controller()
export class AppController {
  constructor(private db: DbService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', service: 'hunter-server', time: new Date().toISOString() };
  }

  @Public()
  @Post('reset')
  reset() {
    this.db.reset();
    return { ok: true, message: '数据已重置为初始状态' };
  }
}
