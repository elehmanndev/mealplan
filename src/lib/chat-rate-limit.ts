import { db } from '@/lib/db';

// Daily cap is per-user (post slice 4). Tuned conservatively because all
// chats share Eric's single Gemini API quota — 5 friends × 20 = 100/day,
// well under the free tier's 1500/day even with bursts.
export const PER_USER_DAILY_CAP = 20;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export type RateLimitResult =
  | { ok: true; used: number; remaining: number; cap: number }
  | { ok: false; reason: 'cap'; used: number; cap: number };

export function checkAndIncrement(userId: number): RateLimitResult {
  const date = todayKey();
  const row = db
    .prepare('SELECT count FROM chat_usage WHERE user_id = ? AND date = ?')
    .get(userId, date) as { count: number } | undefined;
  const current = row?.count ?? 0;
  if (current >= PER_USER_DAILY_CAP) {
    return { ok: false, reason: 'cap', used: current, cap: PER_USER_DAILY_CAP };
  }
  db.prepare(
    `INSERT INTO chat_usage (user_id, date, count) VALUES (?, ?, 1)
     ON CONFLICT(user_id, date) DO UPDATE SET count = count + 1`,
  ).run(userId, date);
  const used = current + 1;
  return { ok: true, used, remaining: PER_USER_DAILY_CAP - used, cap: PER_USER_DAILY_CAP };
}

/**
 * Read-only snapshot of today's usage for a user. Used by /api/chat/usage
 * for the client-side progress bar and by /settings for the server-rendered
 * one.
 */
export function getCurrentUsage(userId: number): { used: number; cap: number } {
  const row = db
    .prepare('SELECT count FROM chat_usage WHERE user_id = ? AND date = ?')
    .get(userId, todayKey()) as { count: number } | undefined;
  return { used: row?.count ?? 0, cap: PER_USER_DAILY_CAP };
}
