import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { DatabaseSync } from 'node:sqlite';
import { seedData, DBShape } from './seed';

/**
 * 正式版数据层：SQLite（Node 内置 node:sqlite）持久化。
 * - 对外仍暴露 db.db.xxx 数组语义，业务模块无需改动；
 * - 每次 save() 以事务整库落盘（WAL 模式，崩溃安全）；
 * - 首次启动自动从旧版 data/db.json 迁移，迁移后归档为 db.json.bak；
 * - 每次启动自动轮转备份（data/backups/，默认保留 7 份）；
 * - 老数据/种子用户无密码时自动补默认密码，保证平滑升级到正式版认证。
 * 说明：node:sqlite 在 Node 22.12 需 --experimental-sqlite 启动（已配置在 npm scripts）。
 */
const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'Hunter@123';
const BACKUP_RETENTION = Number(process.env.DB_BACKUP_KEEP || '7');

@Injectable()
export class DbService implements OnModuleInit {
  private readonly logger = new Logger('DbService');
  db: DBShape;
  private sqlite!: DatabaseSync;
  private readonly dataDir = path.join(__dirname, '..', '..', 'data');
  private readonly dbFile = path.join(this.dataDir, 'hunter.db');
  private readonly legacyFile = path.join(this.dataDir, 'db.json');
  private readonly backupDir = path.join(this.dataDir, 'backups');
  /** 各集合最后一次落盘的序列化内容：用于 save() 只写变化的集合 */
  private readonly snapshot = new Map<string, string>();

  onModuleInit() {
    this.ensureDirs();
    this.openDatabase();
    this.backup();
    this.load();
    this.ensureAuthFields();
    this.ensureFairDates();
    this.logger.log(
      `SQLite 数据层就绪：${this.dbFile}（${this.rowCount()} 条记录，WAL 模式）`,
    );
  }

  private ensureDirs() {
    for (const d of [this.dataDir, this.backupDir]) {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    }
  }

  private openDatabase() {
    this.sqlite = new DatabaseSync(this.dbFile);
    this.sqlite.exec('PRAGMA journal_mode = WAL');
    this.sqlite.exec('PRAGMA synchronous = NORMAL');
    this.sqlite.exec('PRAGMA busy_timeout = 5000');
    this.sqlite.exec(
      'CREATE TABLE IF NOT EXISTS hunter_collections (name TEXT PRIMARY KEY, data TEXT NOT NULL)',
    );
  }

  /** 每次启动轮转备份一次数据库文件 */
  private backup() {
    try {
      if (!fs.existsSync(this.dbFile)) return;
      // checkpoint 确保主文件包含全部最新数据（WAL 模式下复制前落盘）
      try {
        this.sqlite.exec('PRAGMA wal_checkpoint(TRUNCATE)');
      } catch {
        /* 忽略 checkpoint 失败 */
      }
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const dest = path.join(this.backupDir, `hunter-${stamp}.db`);
      fs.copyFileSync(this.dbFile, dest);
      const files = fs
        .readdirSync(this.backupDir)
        .filter((f) => f.endsWith('.db'))
        .sort();
      while (files.length > BACKUP_RETENTION) {
        fs.unlinkSync(path.join(this.backupDir, files.shift()!));
      }
      this.logger.log(`已备份数据库 → backups/${path.basename(dest)}`);
    } catch (e) {
      this.logger.warn(`数据库备份失败：${(e as Error).message}`);
    }
  }

  /** 从 SQLite 恢复各集合；空库时自动迁移旧 db.json 或写入种子数据 */
  private load() {
    const rows = this.sqlite
      .prepare('SELECT name, data FROM hunter_collections')
      .all() as unknown as { name: string; data: string }[];
    const map = new Map(rows.map((r) => [r.name, r.data]));

    if (map.size === 0 && fs.existsSync(this.legacyFile)) {
      this.migrateLegacy();
      const after = this.sqlite
        .prepare('SELECT name, data FROM hunter_collections')
        .all() as unknown as { name: string; data: string }[];
      after.forEach((r) => map.set(r.name, r.data));
    }

    const shape: any = {};
    for (const key of Object.keys(seedData) as (keyof DBShape)[]) {
      if (map.has(key)) {
        try {
          shape[key] = JSON.parse(map.get(key)!);
        } catch {
          shape[key] = JSON.parse(JSON.stringify(seedData[key]));
        }
      } else {
        shape[key] = JSON.parse(JSON.stringify(seedData[key]));
      }
    }
    this.db = shape;
    // 初始化快照：与库中当前内容对齐，后续 save() 只写真正变化的集合
    this.snapshot.clear();
    for (const key of Object.keys(this.db) as (keyof DBShape)[]) {
      this.snapshot.set(key as string, JSON.stringify((this.db as any)[key] ?? []));
    }
  }

  /** 旧版 JSON 文件 → SQLite 一次性迁移 */
  private migrateLegacy() {
    try {
      const raw = fs.readFileSync(this.legacyFile, 'utf-8');
      const old = JSON.parse(raw);
      this.withTransaction(() => {
        const upsert = this.sqlite.prepare(
          'INSERT INTO hunter_collections (name, data) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET data = excluded.data',
        );
        for (const key of Object.keys(old)) {
          if (typeof old[key] === 'object' && old[key] !== null) {
            upsert.run(key, JSON.stringify(old[key]));
          }
        }
      });
      fs.renameSync(this.legacyFile, `${this.legacyFile}.bak`);
      this.logger.log('已从 db.json 迁移数据到 SQLite，原文件归档为 db.json.bak');
    } catch (e) {
      this.logger.warn(
        `db.json 迁移失败（将使用种子数据）：${(e as Error).message}`,
      );
    }
  }

  /** 老数据平滑升级：所有用户补齐 passwordHash 与状态字段 */
  private ensureAuthFields() {
    let dirty = false;
    this.db.users.forEach((u: any) => {
      if (!u.passwordHash) {
        u.passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
        dirty = true;
      }
      if (!u.status) u.status = 'active';
      if (!u.role) u.role = 'sales';
      if (!u.createdAt) u.createdAt = new Date().toISOString();
    });
    if (dirty) this.save();
  }

  /** 平滑升级：给展会集合补齐举办日期字段（来自种子默认值，已存在则保留） */
  private ensureFairDates() {
    const seedFairs = (seedData.fairs || []) as any[];
    const byId = new Map(seedFairs.map((f) => [f.id, f]));
    const fairs = (this.db as any).fairs || [];
    let dirty = false;
    for (const f of fairs) {
      const s = byId.get(f.id);
      if (typeof f.dateStart === 'undefined') {
        f.dateStart = s?.dateStart || '';
        dirty = true;
      }
      if (typeof f.dateEnd === 'undefined') {
        f.dateEnd = s?.dateEnd || '';
        dirty = true;
      }
    }
    if (dirty) this.save();
  }

  private withTransaction(fn: () => void) {
    this.sqlite.exec('BEGIN');
    try {
      fn();
      this.sqlite.exec('COMMIT');
    } catch (e) {
      this.sqlite.exec('ROLLBACK');
      throw e;
    }
  }

  /**
   * 事务整库落盘（保持全量写）。
   *
   * 曾尝试改为「只写变化集合」的增量写（对比序列化快照），但实测在
   * 进程被强杀（kill -Force）时未能保证全部集合落盘，出现数据回退。
   * 数据正确性优先于写放大优化，故保持全量写；
   * 未来若要优化，应在有优雅停机（SIGTERM 钩子 + WAL checkpoint）与回归测试的前提下进行。
   */
  save() {
    this.withTransaction(() => {
      const upsert = this.sqlite.prepare(
        'INSERT INTO hunter_collections (name, data) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET data = excluded.data',
      );
      for (const key of Object.keys(this.db) as (keyof DBShape)[]) {
        upsert.run(key as string, JSON.stringify((this.db as any)[key] ?? []));
      }
    });
  }

  genId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /** 恢复种子数据（管理端重置用） */
  reset() {
    this.db = JSON.parse(JSON.stringify(seedData));
    this.ensureAuthFields();
    this.snapshot.clear(); // 清空快照 → 本次全量写回种子数据
    this.save();
  }

  private rowCount(): number {
    let total = 0;
    for (const key of Object.keys(this.db)) {
      const arr = (this.db as any)[key];
      if (Array.isArray(arr)) total += arr.length;
    }
    return total;
  }
}
