import { agentRoute, paramId, type IdParams } from '@/lib/agent-route';
import { agentPlanMove, agentPlanRemove, agentPlanServings } from '@/lib/agent-ops';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PATCH /api/agent/plan/entries/:id { to_date, to_slot } and/or { servings }
// Both changes run in one transaction so a bad half leaves nothing applied.
export async function PATCH(request: Request, ctx: IdParams) {
  const entry_id = await paramId(ctx);
  return agentRoute(request, (hid, body) => {
    const b = (body ?? {}) as Record<string, unknown>;
    const move = 'to_date' in b || 'to_slot' in b;
    const servings = 'servings' in b;
    if (!move && !servings) {
      // Let zod produce the 400 with a field-level message.
      return agentPlanServings(hid, { entry_id });
    }
    return db.transaction(() => ({
      entry_id,
      ...(move ? agentPlanMove(hid, { entry_id, to_date: b.to_date, to_slot: b.to_slot }) : {}),
      ...(servings ? agentPlanServings(hid, { entry_id, servings: b.servings }) : {}),
    }))();
  });
}

// DELETE /api/agent/plan/entries/:id
export async function DELETE(request: Request, ctx: IdParams) {
  const entry_id = await paramId(ctx);
  return agentRoute(request, (hid) => agentPlanRemove(hid, entry_id));
}
