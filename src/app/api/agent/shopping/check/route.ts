import { agentRoute } from '@/lib/agent-route';
import { agentShoppingCheck } from '@/lib/agent-ops';

export const dynamic = 'force-dynamic';

// POST /api/agent/shopping/check { kind: 'recipe'|'extra', id, checked, date? }
export async function POST(request: Request) {
  return agentRoute(request, agentShoppingCheck);
}
