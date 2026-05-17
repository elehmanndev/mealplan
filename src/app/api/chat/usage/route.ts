import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentUsage } from '@/lib/chat-rate-limit';

export const dynamic = 'force-dynamic';

// Today's chat usage for the current user. Used by the /chat client to seed
// the progress bar on first load — the /api/chat SSE stream updates it
// thereafter via the `done` event.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  return NextResponse.json(getCurrentUsage(user.id));
}
