import { NextResponse } from 'next/server';
import { generateShoppingList, shoppingListToText } from '@/lib/shopping';
import { getCurrentWeek } from '@/lib/week';
import { requireHouseholdId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const householdId = await requireHouseholdId();
  const url = new URL(request.url);
  const weekParam = url.searchParams.get('week');
  const week = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? weekParam : getCurrentWeek();
  const groups = generateShoppingList(householdId, week);
  const text = shoppingListToText(groups);
  return NextResponse.json({ text });
}
