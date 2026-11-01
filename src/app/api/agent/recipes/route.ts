import { agentRoute } from '@/lib/agent-route';
import { agentListRecipes } from '@/lib/agent-ops';

export const dynamic = 'force-dynamic';

// GET /api/agent/recipes?q=lentejas&favorites=1
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  return agentRoute(request, (hid) =>
    agentListRecipes(hid, { q: sp.get('q') ?? undefined, favorites_only: sp.get('favorites') === '1' }),
  );
}
