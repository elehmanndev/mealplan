import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import { db } from '@/lib/db';

declare module 'next-auth' {
  interface User {
    householdId?: number | null;
    role?: 'owner' | 'member' | null;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId?: number;
    householdId?: number | null;
    role?: 'owner' | 'member' | null;
  }
}

type UserRow = { id: number; google_sub: string | null; email: string };
type MembershipRow = { household_id: number; role: 'owner' | 'member' };

const ownerEmail = process.env.MEALPLAN_OWNER_EMAIL?.toLowerCase() ?? null;

function syncUserAndMaybeClaim(args: {
  googleSub: string;
  email: string;
  name: string | null;
  image: string | null;
}): { userId: number; membership: MembershipRow | null } {
  const existing = db
    .prepare('SELECT id, google_sub, email FROM users WHERE google_sub = ? OR email = ?')
    .get(args.googleSub, args.email) as UserRow | undefined;

  let userId: number;
  if (existing) {
    userId = existing.id;
    db.prepare(
      'UPDATE users SET google_sub = ?, email = ?, name = ?, image = ? WHERE id = ?',
    ).run(args.googleSub, args.email, args.name, args.image, userId);
  } else {
    const result = db
      .prepare('INSERT INTO users (google_sub, email, name, image) VALUES (?, ?, ?, ?)')
      .run(args.googleSub, args.email, args.name, args.image);
    userId = Number(result.lastInsertRowid);
  }

  // Owner-claim: if this user has no memberships AND their email matches the
  // configured owner email, attach them as owner of household 1 ("Casa Lehmann"
  // — the household created by migration 009 to hold pre-multi-tenant data).
  const hasMemberships = db
    .prepare('SELECT 1 FROM memberships WHERE user_id = ? LIMIT 1')
    .get(userId);
  if (!hasMemberships && ownerEmail && args.email === ownerEmail) {
    db.prepare(
      "INSERT OR IGNORE INTO memberships (user_id, household_id, role) VALUES (?, 1, 'owner')",
    ).run(userId);
  }

  const membership = db
    .prepare(
      'SELECT household_id, role FROM memberships WHERE user_id = ? ORDER BY joined_at ASC LIMIT 1',
    )
    .get(userId) as MembershipRow | undefined;

  return { userId, membership: membership ?? null };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider !== 'google') return false;
      const email = user.email?.toLowerCase();
      if (!email) return false;
      // Transitional gate (slice 1): only the configured owner can sign in.
      // Removed in slice 3 once /welcome + invite flow exist to give other
      // users their own household instead of dropping them into Eric's data.
      if (!ownerEmail || email !== ownerEmail) return false;
      syncUserAndMaybeClaim({
        googleSub: account.providerAccountId,
        email,
        name: user.name ?? null,
        image: user.image ?? null,
      });
      return true;
    },
    async jwt({ token, user, account }) {
      if (user && account?.provider === 'google') {
        const email = user.email?.toLowerCase();
        if (email) {
          const { userId, membership } = syncUserAndMaybeClaim({
            googleSub: account.providerAccountId,
            email,
            name: user.name ?? null,
            image: user.image ?? null,
          });
          token.userId = userId;
          token.householdId = membership?.household_id ?? null;
          token.role = membership?.role ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId != null) {
        session.user.id = String(token.userId);
        session.user.householdId = token.householdId ?? null;
        session.user.role = token.role ?? null;
      }
      return session;
    },
  },
});
