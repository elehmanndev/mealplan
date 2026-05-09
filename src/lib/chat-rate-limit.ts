import { db } from '@/lib/db';

export const PER_IP_DAILY_CAP = 200;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; reason: 'cap'; cap: number };

export function checkAndIncrement(ip: string): RateLimitResult {
  const date = todayKey();
  const row = db
    .prepare('SELECT count FROM chat_usage WHERE ip = ? AND date = ?')
    .get(ip, date) as { count: number } | undefined;
  const current = row?.count ?? 0;
  if (current >= PER_IP_DAILY_CAP) {
    return { ok: false, reason: 'cap', cap: PER_IP_DAILY_CAP };
  }
  db.prepare(
    `INSERT INTO chat_usage (ip, date, count) VALUES (?, ?, 1)
     ON CONFLICT(ip, date) DO UPDATE SET count = count + 1`,
  ).run(ip, date);
  return { ok: true, remaining: PER_IP_DAILY_CAP - current - 1 };
}
