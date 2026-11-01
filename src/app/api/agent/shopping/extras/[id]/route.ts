import { agentRoute, paramId, type IdParams } from '@/lib/agent-route';
import { agentShoppingRemove } from '@/lib/agent-ops';

export const dynamic = 'force-dynamic';

// DELETE /api/agent/shopping/extras/:id (soft remove, restorable from the app)
export async function DELETE(request: Request, ctx: IdParams) {
  const id = await paramId(ctx);
  return agentRoute(request, (hid) => agentShoppingRemove(hid, id));
}
