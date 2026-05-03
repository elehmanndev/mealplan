import { NextResponse } from 'next/server';
import { listRecipes } from '@/models/recipe';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const tagsParam = url.searchParams.get('tags')?.trim() ?? '';
  const tags = tagsParam ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
  const fav = url.searchParams.get('fav') === '1';
  const recipes = listRecipes({
    search: q || undefined,
    tags,
    favoritesOnly: fav || undefined,
  });
  return NextResponse.json(recipes);
}
