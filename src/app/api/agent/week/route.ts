import { agentRoute } from '@/lib/agent-route';
import { agentWeek } from '@/lib/agent-ops';

export const dynamic = 'force-dynamic';

// GET /api/agent/week?date=YYYY-MM-DD → plan with entry/recipe ids + structured shopping list
export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get('date') ?? undefined;
  return agentRoute(request, (hid) => agentWeek(hid, { date }));
}
