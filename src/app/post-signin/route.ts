import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Tiny resolver that runs immediately after Google sign-in. Decides where
// the user actually wants to go (home vs onboarding) so the browser never
// flashes `/` for invitees who don't have a household yet.
//
// One 302 instead of one 200-rendered-then-redirected. Route Handler (no
// JSX) keeps it cheap.
export async function GET(request: Request) {
  const base = new URL(request.url).origin;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', base));
  if (user.householdId == null) return NextResponse.redirect(new URL('/welcome', base));
  return NextResponse.redirect(new URL('/', base));
}
