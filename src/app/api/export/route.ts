import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireHouseholdId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const householdId = await requireHouseholdId();
  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    householdId,
    recipes: db
      .prepare('SELECT * FROM recipes WHERE household_id = ?')
      .all(householdId),
    // ingredients is a shared catalog (no household scoping). Including it
    // here makes the backup self-contained for a single-household restore.
    ingredients: db.prepare('SELECT * FROM ingredients').all(),
    recipe_ingredients: db
      .prepare(
        `SELECT ri.* FROM recipe_ingredients ri
         JOIN recipes r ON r.id = ri.recipe_id
         WHERE r.household_id = ?`,
      )
      .all(householdId),
    recipe_tags: db
      .prepare(
        `SELECT rt.* FROM recipe_tags rt
         JOIN recipes r ON r.id = rt.recipe_id
         WHERE r.household_id = ?`,
      )
      .all(householdId),
    meal_plan: db
      .prepare('SELECT * FROM meal_plan WHERE household_id = ?')
      .all(householdId),
    shopping_state: db
      .prepare('SELECT * FROM shopping_state WHERE household_id = ?')
      .all(householdId),
    shopping_extras: db
      .prepare('SELECT * FROM shopping_extras WHERE household_id = ?')
      .all(householdId),
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
