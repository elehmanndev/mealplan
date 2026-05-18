import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/auth.config';

// Edge-safe NextAuth instance for middleware. The full DB-backed config lives
// in src/auth.ts and is used by route handlers / server actions / pages.
const { auth } = NextAuth(authConfig);

const PUBLIC_PATH_PREFIXES = [
  '/api/auth',
  '/login',
  '/welcome',
  '/join',
  '/privacy',
  '/terms',
  '/r',
  '/icons',
  '/manifest.webmanifest',
  '/sw.js',
  '/favicon',
  '/apple-touch-icon',
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p),
  );
}

export default auth((req) => {
  const { nextUrl } = req;
  if (isPublic(nextUrl.pathname)) return NextResponse.next();
  if (req.auth) return NextResponse.next();
  const signIn = new URL('/login', nextUrl);
  signIn.searchParams.set('callbackUrl', nextUrl.pathname + nextUrl.search);
  return NextResponse.redirect(signIn);
});

// Match everything except Next internals and static assets that don't need
// auth context. The matcher is the cheapest gate; the function above is the
// authoritative one.
export const config = {
  matcher: ['/((?!_next/static|_next/image|_next/data|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
