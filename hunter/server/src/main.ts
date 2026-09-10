import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

// 零依赖加载 .env（若存在）：将 KEY=VALUE 注入 process.env。
// 必须在所有业务模块 import 之前执行，因为各模块在顶层常量处读取 process.env。
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf-8');
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();

// 动态 require，确保 .env 已注入后再加载 AppModule（其顶层常量依赖 process.env）
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AppModule } = require('./app.module');
import { NestFactory } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api');
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Hunter server running at http://localhost:${port}/api`);
}
bootstrap();
