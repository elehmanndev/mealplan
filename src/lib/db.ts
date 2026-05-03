import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const globalForDb = globalThis as unknown as { db?: Database.Database };

function getDb(): Database.Database {
  if (globalForDb.db) return globalForDb.db;
  const instance = init();
  globalForDb.db = instance;
  return instance;
}

function resolveProjectRoot(): string {
  return process.cwd();
}

function ensureMigrationsTable(instance: Database.Database) {
  instance
    .prepare(
      `CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    )
    .run();
}

function applyMigrations(instance: Database.Database) {
  const dir = path.join(resolveProjectRoot(), 'migrations');
  if (!fs.existsSync(dir)) return;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied = new Set(
    instance
      .prepare('SELECT filename FROM _migrations')
      .all()
      .map((r) => (r as { filename: string }).filename),
  );

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    const tx = instance.transaction(() => {
      instance.exec(sql);
      instance.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(file);
    });
    tx();
  }
}

function applySeeds(instance: Database.Database) {
  const dir = path.join(resolveProjectRoot(), 'seeds');
  if (!fs.existsSync(dir)) return;
  const count = (instance.prepare('SELECT COUNT(*) as c FROM ingredients').get() as { c: number }).c;
  if (count > 0) return;
  const file = path.join(dir, 'ingredients.sql');
  if (!fs.existsSync(file)) return;
  const sql = fs.readFileSync(file, 'utf8');
  instance.exec(sql);
}

function init(): Database.Database {
  const dbPath = process.env.DATABASE_PATH ?? path.join(resolveProjectRoot(), 'data', 'mealplan.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const instance = new Database(dbPath);
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');
  ensureMigrationsTable(instance);
  applyMigrations(instance);
  applySeeds(instance);
  return instance;
}

export const db = new Proxy({} as Database.Database, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getDb(), prop, receiver);
    return typeof value === 'function' ? value.bind(getDb()) : value;
  },
});
