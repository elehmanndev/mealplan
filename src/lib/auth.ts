import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  image: string | null;
  householdId: number | null;
  role: 'owner' | 'member' | null;
};

type MembershipRow = { household_id: number; role: 'owner' | 'member' };

// Single source of truth for "which household is this user in right now":
// always the DB, never the JWT. The JWT is only trusted for the user id.
//
// Why: the JWT is stamped at sign-in time and isn't re-stamped when the user
// creates a household via `/welcome` or accepts an invite via `/join/<token>`.
// Trusting the JWT for `householdId` causes an infinite "no household → /welcome
// → just created one → JWT still says null → /welcome again" loop. Reading the
// DB on every request side-steps that entirely. The query is one indexed lookup.
function readActiveMembership(userId: number): MembershipRow | null {
  const row = db
    .prepare(
      'SELECT household_id, role FROM memberships WHERE user_id = ? ORDER BY joined_at ASC LIMIT 1',
    )
    .get(userId) as MembershipRow | undefined;
  return row ?? null;
}

/**
 * Resolve the currently signed-in user from the NextAuth session, then
 * re-resolve their active household from the DB (not the JWT — see
 * readActiveMembership for the reason).
 *
 * Returns `null` when there is no session. Pages that must work pre-onboarding
 * (e.g. `/welcome`) should treat `null` / `householdId === null` as a signal
 * to keep the user in the onboarding flow rather than throwing.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const id = session.user.id ? Number(session.user.id) : null;
  if (id == null || Number.isNaN(id)) return null;
  const membership = readActiveMembership(id);
  return {
    id,
    email: session.user.email,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    householdId: membership?.household_id ?? null,
    role: membership?.role ?? null,
  };
}

/**
 * Throw-on-missing variant. Use in server actions / API routes that are
 * already gated by middleware — getting `null` here means the gate has a
 * hole and we should fail loud.
 */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthenticated');
  return user;
}

/**
 * Convenience: the active household id, or throw if the user has none yet.
 * Use in server actions / API routes where landing here without a household
 * is a bug (the page-level gate should have redirected to `/welcome` first).
 */
export async function requireHouseholdId(): Promise<number> {
  const user = await requireUser();
  if (user.householdId == null) {
    throw new Error('User has no active household');
  }
  return user.householdId;
}

/**
 * Page-level gate. Returns the active household id, or redirects:
 *   - no session → /login
 *   - session but no membership → /welcome
 *
 * Use at the top of every gated server component (home, recipes, shopping,
 * settings, …). Server actions should use `requireHouseholdId` instead —
 * actions can't render a redirect to `/welcome` cleanly.
 */
export async function requireHouseholdIdOrRedirect(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.householdId == null) redirect('/welcome');
  return user.householdId;
}
