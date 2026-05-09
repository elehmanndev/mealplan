import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sanitizeJsonText } from '@/lib/sanitize-json';
import { importRecipes, RecipeInputSchema } from '@/lib/recipe-import';

export const dynamic = 'force-dynamic';

const PayloadSchema = z.union([
  RecipeInputSchema,
  z.array(RecipeInputSchema),
  z.object({ recipes: z.array(RecipeInputSchema) }),
]);

export async function POST(request: Request) {
  let json: unknown;
  try {
    const raw = await request.text();
    json = JSON.parse(sanitizeJsonText(raw));
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = PayloadSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first.path.join('.');
    return NextResponse.json(
      { error: path ? `Error en ${path}: ${first.message}` : first.message },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const recipes = Array.isArray(data) ? data : 'recipes' in data ? data.recipes : [data];

  try {
    const { imported, skipped } = importRecipes(recipes);
    return NextResponse.json({ ok: true, imported, skipped });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al importar' },
      { status: 500 },
    );
  }
}
