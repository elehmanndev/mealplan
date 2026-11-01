import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Isolated DB: set before anything imports @/lib/db.
const TEST_DB = path.join(process.cwd(), '.test-agent-api.db');
process.env.DATABASE_PATH = TEST_DB;
process.env.MEALPLAN_AGENT_TOKEN = 'test-token';
process.env.MEALPLAN_AGENT_HOUSEHOLD_ID = '1';

// revalidatePath needs a Next request store; not relevant here.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const AUTH = { authorization: 'Bearer test-token' };
const BASE = 'http://x';
// Saturday 2026-10-31 opens the week; Mon 2026-11-02 is inside it.
const DAY = '2026-11-02';

type Ctx = { params: Promise<{ id: string }> };
const ctx = (id: number | string): Ctx => ({ params: Promise.resolve({ id: String(id) }) });
const req = (url: string, init: { method?: string; body?: unknown; auth?: boolean } = {}) =>
  new Request(BASE + url, {
    method: init.method ?? 'GET',
    headers: { ...(init.auth === false ? {} : AUTH), 'content-type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

let OTHER_RECIPE: number;
let OTHER_ENTRY: number;
let OTHER_EXTRA: number;

beforeAll(async () => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  const { db } = await import('@/lib/db');
  db.exec(`
    INSERT INTO households (id, name) VALUES (2, 'Otra casa');
    INSERT INTO recipes (id, household_id, name, base_servings) VALUES (2000, 1, 'Lentejas estofadas', 2);
    INSERT INTO recipes (id, household_id, name, base_servings) VALUES (2001, 1, 'Pollo al horno', 4);
    INSERT INTO recipes (id, household_id, name, base_servings) VALUES (2002, 2, 'Lentejas ajenas', 2);
    INSERT INTO ingredients (id, name, default_unit, shopping_category, supermarket)
      VALUES (6000, 'AgentLenteja', 'g', 'despensa', 'mercadona');
    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (2000, 6000, 200, 'g');
    INSERT INTO meal_plan (id, household_id, date, slot, recipe_id, servings) VALUES (9002, 2, '${DAY}', 'cena', 2002, 2);
    INSERT INTO shopping_extras (id, household_id, week, name) VALUES (9003, 2, '2026-10-31', 'Ajeno');
  `);
  OTHER_RECIPE = 2002;
  OTHER_ENTRY = 9002;
  OTHER_EXTRA = 9003;
});

afterAll(() => {
  for (const f of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`]) if (fs.existsSync(f)) fs.unlinkSync(f);
});

describe('agent REST API', () => {
  it('401 without or with a wrong token on every endpoint', async () => {
    const week = await import('../agent/week/route');
    const recipes = await import('../agent/recipes/route');
    const entries = await import('../agent/plan/entries/route');
    const entry = await import('../agent/plan/entries/[id]/route');
    const extras = await import('../agent/shopping/extras/route');
    const extra = await import('../agent/shopping/extras/[id]/route');
    const check = await import('../agent/shopping/check/route');
    const responses = await Promise.all([
      week.GET(req('/api/agent/week', { auth: false })),
      recipes.GET(req('/api/agent/recipes', { auth: false })),
      entries.POST(req('/api/agent/plan/entries', { method: 'POST', body: {}, auth: false })),
      entry.PATCH(req('/api/agent/plan/entries/1', { method: 'PATCH', body: {}, auth: false }), ctx(1)),
      entry.DELETE(req('/api/agent/plan/entries/1', { method: 'DELETE', auth: false }), ctx(1)),
      extras.POST(req('/api/agent/shopping/extras', { method: 'POST', body: {}, auth: false })),
      extra.DELETE(req('/api/agent/shopping/extras/1', { method: 'DELETE', auth: false }), ctx(1)),
      check.POST(req('/api/agent/shopping/check', { method: 'POST', body: {}, auth: false })),
      week.GET(new Request(BASE + '/api/agent/week', { headers: { authorization: 'Bearer nope' } })),
    ]);
    for (const r of responses) expect(r.status).toBe(401);
  });

  it('searches recipes by name, only within the household', async () => {
    const { GET } = await import('../agent/recipes/route');
    const res = await GET(req('/api/agent/recipes?q=LENTEJAS'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.map((r: { id: number }) => r.id)).toEqual([2000]);
  });

  it('gets a recipe, 404 for another household', async () => {
    const { GET } = await import('../agent/recipes/[id]/route');
    const ok = await GET(req('/api/agent/recipes/2000'), ctx(2000));
    expect(ok.status).toBe(200);
    expect((await ok.json()).ingredients[0].name).toBe('AgentLenteja');
    expect((await GET(req(`/api/agent/recipes/${OTHER_RECIPE}`), ctx(OTHER_RECIPE))).status).toBe(404);
    expect((await GET(req('/api/agent/recipes/abc'), ctx('abc'))).status).toBe(400);
  });

  it('adds, moves, rescales and removes a plan entry', async () => {
    const entries = await import('../agent/plan/entries/route');
    const entry = await import('../agent/plan/entries/[id]/route');
    const week = await import('../agent/week/route');

    const add = await entries.POST(
      req('/api/agent/plan/entries', { method: 'POST', body: { date: DAY, slot: 'comida', recipe_id: 2000, servings: 4 } }),
    );
    expect(add.status).toBe(200);
    const { entry_id } = await add.json();

    let w = await (await week.GET(req(`/api/agent/week?date=${DAY}`))).json();
    expect(w.week).toBe('2026-10-31');
    const mon = w.days.find((d: { date: string }) => d.date === DAY);
    expect(mon.comida).toEqual([{ entry_id, recipe_id: 2000, name: 'Lentejas estofadas', emoji: '🍽️', servings: 4 }]);
    const lenteja = w.shopping.flatMap((g: { items: unknown[] }) => g.items).find((i: { name: string }) => i.name === 'AgentLenteja');
    expect(lenteja.parts).toEqual([{ quantity: 400, unit: 'g' }]);
    // Another household's entries never show up.
    expect(mon.cena).toEqual([]);

    const patch = await entry.PATCH(
      req(`/api/agent/plan/entries/${entry_id}`, { method: 'PATCH', body: { to_date: '2026-11-03', to_slot: 'cena', servings: 2 } }),
      ctx(entry_id),
    );
    expect(patch.status).toBe(200);
    w = await (await week.GET(req(`/api/agent/week?date=${DAY}`))).json();
    const tue = w.days.find((d: { date: string }) => d.date === '2026-11-03');
    expect(tue.cena[0]).toMatchObject({ entry_id, servings: 2 });

    const del = await entry.DELETE(req(`/api/agent/plan/entries/${entry_id}`, { method: 'DELETE' }), ctx(entry_id));
    expect(del.status).toBe(200);
    expect((await entry.DELETE(req('/x', { method: 'DELETE' }), ctx(entry_id))).status).toBe(404);
  });

  it('rejects invalid plan input with 400', async () => {
    const entries = await import('../agent/plan/entries/route');
    const entry = await import('../agent/plan/entries/[id]/route');
    const bad = await entries.POST(
      req('/x', { method: 'POST', body: { date: '02/11/2026', slot: 'desayuno', recipe_id: 2000, servings: 0 } }),
    );
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toBe('validation');
    const notJson = await entries.POST(
      new Request(BASE + '/x', { method: 'POST', headers: AUTH, body: '{nope' }),
    );
    expect(notJson.status).toBe(400);
    expect((await entry.PATCH(req('/x', { method: 'PATCH', body: {} }), ctx(1))).status).toBe(400);
  });

  it('never touches another household (404, row unchanged)', async () => {
    const { db } = await import('@/lib/db');
    const entries = await import('../agent/plan/entries/route');
    const entry = await import('../agent/plan/entries/[id]/route');
    const extra = await import('../agent/shopping/extras/[id]/route');
    const check = await import('../agent/shopping/check/route');

    const addForeign = await entries.POST(
      req('/x', { method: 'POST', body: { date: DAY, slot: 'comida', recipe_id: OTHER_RECIPE, servings: 2 } }),
    );
    expect(addForeign.status).toBe(404);
    expect(
      (await entry.PATCH(req('/x', { method: 'PATCH', body: { servings: 9 } }), ctx(OTHER_ENTRY))).status,
    ).toBe(404);
    expect(
      (await entry.PATCH(req('/x', { method: 'PATCH', body: { to_date: DAY, to_slot: 'comida' } }), ctx(OTHER_ENTRY))).status,
    ).toBe(404);
    expect((await entry.DELETE(req('/x', { method: 'DELETE' }), ctx(OTHER_ENTRY))).status).toBe(404);
    expect((await extra.DELETE(req('/x', { method: 'DELETE' }), ctx(OTHER_EXTRA))).status).toBe(404);
    expect(
      (await check.POST(req('/x', { method: 'POST', body: { kind: 'extra', id: OTHER_EXTRA, checked: true } }))).status,
    ).toBe(404);

    expect(db.prepare('SELECT slot, servings FROM meal_plan WHERE id = ?').get(OTHER_ENTRY)).toEqual({ slot: 'cena', servings: 2 });
    expect(db.prepare('SELECT checked, removed FROM shopping_extras WHERE id = ?').get(OTHER_EXTRA)).toEqual({ checked: 0, removed: 0 });
  });

  it('adds, ticks and removes a shopping extra; ticks a recipe item', async () => {
    const { db } = await import('@/lib/db');
    const extras = await import('../agent/shopping/extras/route');
    const extra = await import('../agent/shopping/extras/[id]/route');
    const check = await import('../agent/shopping/check/route');
    const entries = await import('../agent/plan/entries/route');

    const add = await extras.POST(
      req('/x', { method: 'POST', body: { name: 'Papel de cocina', date: DAY, supermarket: 'mercadona' } }),
    );
    expect(add.status).toBe(200);
    const { id, week } = await add.json();
    expect(week).toBe('2026-10-31'); // any day maps to the Saturday key

    expect((await check.POST(req('/x', { method: 'POST', body: { kind: 'extra', id, checked: true, date: DAY } }))).status).toBe(200);
    expect(db.prepare('SELECT checked FROM shopping_extras WHERE id = ?').get(id)).toEqual({ checked: 1 });

    expect((await extra.DELETE(req('/x', { method: 'DELETE' }), ctx(id))).status).toBe(200);
    expect(db.prepare('SELECT removed FROM shopping_extras WHERE id = ?').get(id)).toEqual({ removed: 1 });

    expect((await extras.POST(req('/x', { method: 'POST', body: { name: '' } }))).status).toBe(400);

    // Recipe-derived item: needs the plan to contain the recipe that week.
    await entries.POST(req('/x', { method: 'POST', body: { date: DAY, slot: 'cena', recipe_id: 2000, servings: 2 } }));
    const tick = await check.POST(req('/x', { method: 'POST', body: { kind: 'recipe', id: 6000, checked: true, date: DAY } }));
    expect(tick.status).toBe(200);
    expect(
      db.prepare('SELECT checked FROM shopping_state WHERE household_id = 1 AND week = ? AND ingredient_id = 6000').get('2026-10-31'),
    ).toEqual({ checked: 1 });
    // Not in this week's list → 404.
    expect(
      (await check.POST(req('/x', { method: 'POST', body: { kind: 'recipe', id: 6000, checked: true, date: '2026-12-01' } }))).status,
    ).toBe(404);
  });

  it('keeps GET /api/agent/plan unchanged', async () => {
    const { GET } = await import('../agent/plan/route');
    const res = await GET(req(`/api/agent/plan?date=${DAY}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body)).toEqual(['week', 'days', 'shopping']);
    expect(typeof body.shopping).toBe('string');
  });
});
