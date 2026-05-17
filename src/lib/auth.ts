import { auth } from '@/auth';

export type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  image: string | null;
  householdId: number | null;
  role: 'owner' | 'member' | null;
};

/**
 * Resolve the currently signed-in user from the NextAuth session.
 *
 * Returns `null` when there is no session. Pages and server actions should
 * either redirect to `/api/auth/signin` (middleware already does this for
 * most routes) or, for routes that must work pre-onboarding, treat `null` /
 * `householdId === null` as the user landing on `/welcome`.
 *
 * Legacy callers used to get a string email out of this module (sourced from
 * the Cloudflare Access header). All call-sites that just want the email can
 * read `(await getCurrentUser())?.email`.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const id = session.user.id ? Number(session.user.id) : null;
  if (id == null || Number.isNaN(id)) return null;
  return {
    id,
    email: session.user.email,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    householdId: session.user.householdId ?? null,
    role: session.user.role ?? null,
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
 * Convenience: the active household id, or throw if the user has none yet
 * (i.e. signed in but hasn't completed onboarding). Use in routes that
 * should never be reachable in that intermediate state.
 */
export async function requireHouseholdId(): Promise<number> {
  const user = await requireUser();
  if (user.householdId == null) {
    throw new Error('User has no active household');
  }
  return user.householdId;
}
