import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const TEST_DB = path.join(process.cwd(), '.test-mcp.db');
process.env.DATABASE_PATH = TEST_DB;
process.env.MEALPLAN_AGENT_TOKEN = 'test-token';
process.env.MEALPLAN_AGENT_HOUSEHOLD_ID = '1';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const DAY = '2026-11-02';
const URL_ = 'http://x/api/mcp';

// Route the SDK client's fetch straight into the Next route handler.
async function connect(token = 'test-token') {
  const route = await import('../mcp/route');
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init);
    const handler = route[request.method as 'POST' | 'GET' | 'DELETE'];
    return handler(request);
  };
  const client = new Client({ name: 'test', version: '0' });
  const transport = new StreamableHTTPClientTransport(new URL(URL_), {
    fetch: fetchImpl,
    requestInit: { headers: { authorization: `Bearer ${token}` } },
  });
  await client.connect(transport);
  return client;
}

type ToolResult = { isError?: boolean; content: { type: string; text: string }[] };
async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
  const res = (await client.callTool({ name, arguments: args })) as ToolResult;
  return { isError: !!res.isError, text: res.content[0].text, json: () => JSON.parse(res.content[0].text) };
}

beforeAll(async () => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  const { db } = await import('@/lib/db');
  db.exec(`
    INSERT INTO households (id, name) VALUES (2, 'Otra casa');
    INSERT INTO recipes (id, household_id, name, base_servings) VALUES (3000, 1, 'Crema de calabaza', 2);
    INSERT INTO recipes (id, household_id, name, base_servings) VALUES (3001, 2, 'Calabaza ajena', 2);
    INSERT INTO meal_plan (id, household_id, date, slot, recipe_id, servings) VALUES (9100, 2, '${DAY}', 'cena', 3001, 2);
  `);
});

afterAll(() => {
  for (const f of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`]) if (fs.existsSync(f)) fs.unlinkSync(f);
});

describe('MCP server /api/mcp', () => {
  it('401 without a valid bearer token', async () => {
    const { POST } = await import('../mcp/route');
    const res = await POST(new Request(URL_, { method: 'POST', body: '{}' }));
    expect(res.status).toBe(401);
    await expect(connect('wrong')).rejects.toThrow();
  });

  it('lists all tools', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'mealplan_plan_add',
      'mealplan_plan_move',
      'mealplan_plan_remove',
      'mealplan_plan_servings',
      'mealplan_recipe',
      'mealplan_recipes',
      'mealplan_shopping_add',
      'mealplan_shopping_check',
      'mealplan_shopping_remove',
      'mealplan_week',
    ]);
    expect(tools.find((t) => t.name === 'mealplan_week')?.description).toMatch(/Saturday to Friday/);
  });

  it('runs the full plan + shopping flow', async () => {
    const client = await connect();
    const found = (await call(client, 'mealplan_recipes', { q: 'calabaza' })).json();
    expect(found.map((r: { id: number }) => r.id)).toEqual([3000]);
    expect((await call(client, 'mealplan_recipe', { recipe_id: 3000 })).json().name).toBe('Crema de calabaza');

    const added = (await call(client, 'mealplan_plan_add', { date: DAY, slot: 'cena', recipe_id: 3000, servings: 3 })).json();
    const entry_id = added.entry_id;
    expect((await call(client, 'mealplan_plan_move', { entry_id, to_date: '2026-11-04', to_slot: 'comida' })).isError).toBe(false);
    expect((await call(client, 'mealplan_plan_servings', { entry_id, servings: 5 })).isError).toBe(false);

    let week = (await call(client, 'mealplan_week', { date: DAY })).json();
    expect(week.week).toBe('2026-10-31');
    const wed = week.days.find((d: { date: string }) => d.date === '2026-11-04');
    expect(wed.comida[0]).toMatchObject({ entry_id, servings: 5 });
    // Household 2's dinner on DAY is invisible.
    expect(week.days.find((d: { date: string }) => d.date === DAY).cena).toEqual([]);

    const extra = (await call(client, 'mealplan_shopping_add', { name: 'Servilletas', date: DAY })).json();
    expect((await call(client, 'mealplan_shopping_check', { kind: 'extra', id: extra.id, checked: true, date: DAY })).isError).toBe(false);
    week = (await call(client, 'mealplan_week', { date: DAY })).json();
    const item = week.shopping.flatMap((g: { items: unknown[] }) => g.items).find((i: { name: string }) => i.name === 'Servilletas');
    expect(item).toMatchObject({ kind: 'extra', id: extra.id, checked: true });

    expect((await call(client, 'mealplan_shopping_remove', { id: extra.id })).isError).toBe(false);
    expect((await call(client, 'mealplan_plan_remove', { entry_id })).isError).toBe(false);
    week = (await call(client, 'mealplan_week', { date: DAY })).json();
    expect(week.days.every((d: { comida: unknown[]; cena: unknown[] }) => d.comida.length + d.cena.length === 0)).toBe(true);
  });

  it('returns tool errors for validation and other-household ids', async () => {
    const { db } = await import('@/lib/db');
    const client = await connect();
    const bad = await call(client, 'mealplan_plan_add', { date: 'mañana', slot: 'cena', recipe_id: 3000, servings: 2 });
    expect(bad.isError).toBe(true);
    expect(bad.text).toMatch(/validation/);

    for (const [name, args] of [
      ['mealplan_recipe', { recipe_id: 3001 }],
      ['mealplan_plan_add', { date: DAY, slot: 'cena', recipe_id: 3001, servings: 2 }],
      ['mealplan_plan_servings', { entry_id: 9100, servings: 8 }],
      ['mealplan_plan_remove', { entry_id: 9100 }],
    ] as const) {
      const r = await call(client, name, args);
      expect(r.isError, name).toBe(true);
      expect(r.text).toMatch(/not found/);
    }
    expect(db.prepare('SELECT servings FROM meal_plan WHERE id = 9100').get()).toEqual({ servings: 2 });
  });
});
