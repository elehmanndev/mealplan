import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    recipes: db.prepare('SELECT * FROM recipes').all(),
    ingredients: db.prepare('SELECT * FROM ingredients').all(),
    recipe_ingredients: db.prepare('SELECT * FROM recipe_ingredients').all(),
    recipe_tags: db.prepare('SELECT * FROM recipe_tags').all(),
    meal_plan: db.prepare('SELECT * FROM meal_plan').all(),
    shopping_state: db.prepare('SELECT * FROM shopping_state').all(),
    shopping_extras: db.prepare('SELECT * FROM shopping_extras').all(),
  };

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="mealplan-backup-${date}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
