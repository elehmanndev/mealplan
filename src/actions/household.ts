'use server';

import { randomBytes } from 'node:crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getCurrentUser, requireUser } from '@/lib/auth';
import { HouseholdNameInput, InviteTokenInput } from '@/schemas';

const INVITE_TTL_DAYS = 7;

type InviteRow = {
  token: string;
  household_id: number;
  expires_at: string;
  used_at: string | null;
};

/**
 * Create a household for the current user and attach them as `owner`.
 * Used by the `/welcome` form. Redirects to `/` on success.
 *
 * Wrapped in a transaction so we never end up with a household row that has
 * no owner membership (which would orphan the data on `requireHousehold…`).
 */
export async function createHouseholdAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const name = HouseholdNameInput.parse(formData.get('name'));

  db.transaction(() => {
    const result = db
      .prepare('INSERT INTO households (name) VALUES (?)')
      .run(name);
    const householdId = Number(result.lastInsertRowid);
    db.prepare(
      "INSERT INTO memberships (user_id, household_id, role) VALUES (?, ?, 'owner')",
    ).run(user.id, householdId);
  })();

  // Bust caches that may have rendered against a "no household" state.
  revalidatePath('/', 'layout');
  redirect('/');
}

export type CreateInviteResult = { token: string; url: string };

/**
 * Generate a single-use invite token for the current user's active household.
 * Only the household owner may invite. Caller renders the resulting URL as a
 * shareable link.
 */
export async function createInviteAction(): Promise<CreateInviteResult> {
  const user = await requireUser();
  if (user.householdId == null) throw new Error('No active household');
  if (user.role !== 'owner') throw new Error('Solo el propietario puede invitar');

  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 3600 * 1000).toISOString();

  db.prepare(
    'INSERT INTO invites (token, household_id, invited_by_user_id, expires_at) VALUES (?, ?, ?, ?)',
  ).run(token, user.householdId, user.id, expiresAt);

  const base = process.env.AUTH_URL ?? '';
  const url = `${base.replace(/\/$/, '')}/join/${token}`;
  revalidatePath('/settings/household');
  return { token, url };
}

export type RedeemInviteResult =
  | { ok: true; householdId: number; alreadyMember: boolean }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' };

/**
 * Validate an invite token and attach the current user to the household.
 * Used by `/join/[token]`. The page (not this action) handles the redirect
 * so it can show a nice error page for `invalid` / `expired` / `used`.
 */
export async function redeemInviteAction(rawToken: string): Promise<RedeemInviteResult> {
  const user = await requireUser();
  const tokenParse = InviteTokenInput.safeParse(rawToken);
  if (!tokenParse.success) return { ok: false, reason: 'invalid' };
  const token = tokenParse.data;

  const invite = db
    .prepare(
      'SELECT token, household_id, expires_at, used_at FROM invites WHERE token = ?',
    )
    .get(token) as InviteRow | undefined;
  if (!invite) return { ok: false, reason: 'invalid' };
  if (invite.used_at) return { ok: false, reason: 'used' };
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  // Already a member? Don't double-insert and don't burn the invite —
  // just send them home.
  const existing = db
    .prepare('SELECT 1 FROM memberships WHERE user_id = ? AND household_id = ?')
    .get(user.id, invite.household_id);
  if (existing) {
    return { ok: true, householdId: invite.household_id, alreadyMember: true };
  }

  db.transaction(() => {
    db.prepare(
      "INSERT INTO memberships (user_id, household_id, role) VALUES (?, ?, 'member')",
    ).run(user.id, invite.household_id);
    db.prepare(
      'UPDATE invites SET used_at = datetime(\'now\'), used_by_user_id = ? WHERE token = ?',
    ).run(user.id, token);
  })();

  revalidatePath('/', 'layout');
  return { ok: true, householdId: invite.household_id, alreadyMember: false };
}

export type HouseholdMember = {
  userId: number;
  email: string;
  name: string | null;
  image: string | null;
  role: 'owner' | 'member';
  joinedAt: string;
};

/**
 * Server-side helper for `/settings/household`. Lists current members of the
 * caller's active household. Throws if no household — the page-level gate
 * should redirect to `/welcome` before this is reached.
 */
export async function listMembersForCurrentHousehold(): Promise<HouseholdMember[]> {
  const user = await getCurrentUser();
  if (!user || user.householdId == null) return [];
  const rows = db
    .prepare(
      `SELECT u.id AS userId, u.email, u.name, u.image, m.role, m.joined_at AS joinedAt
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.household_id = ?
       ORDER BY m.joined_at ASC`,
    )
    .all(user.householdId) as HouseholdMember[];
  return rows;
}
