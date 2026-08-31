import { Controller, Get, Post } from '@nestjs/common';
import { DbService } from './db/db.service';

@Controller()
export class AppController {
  constructor(private db: DbService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'hunter-server', time: new Date().toISOString() };
  }

  @Post('reset')
  reset() {
    this.db.reset();
    return { ok: true, message: '演示数据已重置' };
  }
}
