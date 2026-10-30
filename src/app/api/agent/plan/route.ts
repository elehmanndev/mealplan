import { NextResponse } from 'next/server';
import { agentHouseholdId } from '@/lib/agent-auth';
import { listWeekPlan } from '@/models/plan';
import { generateShoppingList, shoppingListToText } from '@/lib/shopping';
import { dateFromString, formatDate, getCurrentWeek, getWeekDates } from '@/lib/week';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/agent/plan?date=YYYY-MM-DD  → the Saturday→Friday week containing that date
// Bearer token only (see src/lib/agent-auth.ts). Read-only.
export async function GET(request: Request) {
  const householdId = agentHouseholdId(request);
  if (householdId === null) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const dateParam = new URL(request.url).searchParams.get('date');
  if (dateParam && !DATE_RE.test(dateParam)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }
  const week = getCurrentWeek(dateParam ? dateFromString(dateParam) : new Date());

  const entries = listWeekPlan(householdId, week);
  const days = getWeekDates(week).map((d) => {
    const date = formatDate(d);
    const meals = (slot: 'comida' | 'cena') =>
      entries
        .filter((e) => e.date === date && e.slot === slot)
        .map((e) => ({
          name: e.recipe?.name ?? '',
          emoji: e.recipe?.emoji ?? '',
          servings: e.servings,
        }));
    return { date, comida: meals('comida'), cena: meals('cena') };
  });

  const shopping = shoppingListToText(generateShoppingList(householdId, week));

  return NextResponse.json({ week, days, shopping });
}
