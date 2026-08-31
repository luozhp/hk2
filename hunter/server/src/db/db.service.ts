import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { seedData, DBShape } from './seed';

@Injectable()
export class DbService implements OnModuleInit {
  db: DBShape;
  private file = path.join(__dirname, '..', '..', 'data', 'db.json');

  onModuleInit() {
    this.load();
  }

  load() {
    try {
      const raw = fs.readFileSync(this.file, 'utf-8');
      this.db = { ...JSON.parse(raw) };
    } catch {
      this.db = JSON.parse(JSON.stringify(seedData));
      this.save();
    }
  }

  save() {
    const dir = path.dirname(this.file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.db, null, 2), 'utf-8');
  }

  genId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  reset() {
    this.db = JSON.parse(JSON.stringify(seedData));
    this.save();
  }
}
