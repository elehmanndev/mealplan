import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

// Edge-safe base config. NO database imports here — this module is loaded by
// `src/middleware.ts`, which runs in the Edge runtime and can't see better-
// sqlite3 / node:fs / node:path.
//
// The full config (with DB-backed signIn / jwt callbacks) lives in src/auth.ts
// and is what route handlers, server actions, and pages consume.
export const authConfig = {
  providers: [Google],
  session: { strategy: 'jwt' },
  trustHost: true,
  pages: {
    signIn: '/login',
    error: '/login',
  },
} satisfies NextAuthConfig;
