import { NextResponse } from 'next/server';
import { generateShoppingList, shoppingListToText } from '@/lib/shopping';
import { getCurrentWeek } from '@/lib/week';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const weekParam = url.searchParams.get('week');
  const week = weekParam && /^\d{4}-W\d{2}$/.test(weekParam) ? weekParam : getCurrentWeek();
  const groups = generateShoppingList(week);
  const text = shoppingListToText(groups);
  return NextResponse.json({ text });
}
