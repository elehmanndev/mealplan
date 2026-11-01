import { agentRoute, paramId, type IdParams } from '@/lib/agent-route';
import { agentGetRecipe } from '@/lib/agent-ops';

export const dynamic = 'force-dynamic';

// GET /api/agent/recipes/:id → recipe with ingredients
export async function GET(request: Request, ctx: IdParams) {
  const id = await paramId(ctx);
  return agentRoute(request, (hid) => agentGetRecipe(hid, id));
}
