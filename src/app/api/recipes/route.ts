import { NextResponse } from 'next/server';
import { listRecipes } from '@/models/recipe';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const category = url.searchParams.get('category')?.trim() ?? '';
  const fav = url.searchParams.get('fav') === '1';
  const recipes = listRecipes({
    search: q || undefined,
    category: category || undefined,
    favoritesOnly: fav || undefined,
  });
  return NextResponse.json(recipes);
}
