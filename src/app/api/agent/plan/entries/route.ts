import { agentRoute } from '@/lib/agent-route';
import { agentPlanAdd } from '@/lib/agent-ops';

export const dynamic = 'force-dynamic';

// POST /api/agent/plan/entries { date, slot, recipe_id, servings }
export async function POST(request: Request) {
  return agentRoute(request, agentPlanAdd);
}
