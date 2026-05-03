import { NextResponse } from 'next/server';
import { searchIngredients } from '@/models/ingredient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? '';
  const limit = Math.min(50, Number(url.searchParams.get('limit') ?? 10));
  const results = searchIngredients(q, limit);
  return NextResponse.json(results);
}
