import { timingSafeEqual } from 'node:crypto';

// Read-only access for Eric's OpenBot agent, which has no Google session.
// Disabled unless MEALPLAN_AGENT_TOKEN is set. The token maps to one household
// (MEALPLAN_AGENT_HOUSEHOLD_ID, default 1 = Casa Lehmann).

export function agentHouseholdId(request: Request): number | null {
  const expected = process.env.MEALPLAN_AGENT_TOKEN;
  if (!expected) return null;
  const header = request.headers.get('authorization') ?? '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const id = Number(process.env.MEALPLAN_AGENT_HOUSEHOLD_ID ?? '1');
  return Number.isInteger(id) && id > 0 ? id : null;
}
