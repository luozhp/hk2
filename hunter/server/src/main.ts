import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// 零依赖加载 .env（若存在）：将 KEY=VALUE 注入 process.env，不覆盖已有变量
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf-8');
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api');
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Hunter server running at http://localhost:${port}/api`);
}
bootstrap();
