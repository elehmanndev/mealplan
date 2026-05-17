import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import { db } from '@/lib/db';

// JWT only carries the user id. Household membership / role are looked up
// fresh from the DB on every request in src/lib/auth.ts — see the comment
// in `readActiveMembership` for why we don't trust the JWT for that.
declare module '@auth/core/jwt' {
  interface JWT {
    userId?: number;
  }
}

type UserRow = { id: number; google_sub: string | null; email: string };

const ownerEmail = process.env.MEALPLAN_OWNER_EMAIL?.toLowerCase() ?? null;

function syncUserAndMaybeClaim(args: {
  googleSub: string;
  email: string;
  name: string | null;
  image: string | null;
}): number {
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

  return userId;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider !== 'google') return false;
      const email = user.email?.toLowerCase();
      if (!email) return false;
      // Open sign-up. After this returns true the user may still have no
      // household; the page-level gate (`requireHouseholdIdOrRedirect`) sends
      // them to `/welcome` to create one or accept an invite.
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
          token.userId = syncUserAndMaybeClaim({
            googleSub: account.providerAccountId,
            email,
            name: user.name ?? null,
            image: user.image ?? null,
          });
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId != null) {
        session.user.id = String(token.userId);
      }
      return session;
    },
  },
});
