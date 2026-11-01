import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ZodError } from 'zod';
import { NotFoundError } from '@/lib/errors';
import { SHOPPING_CATEGORIES } from '@/lib/shopping-types';
import { SLOTS, UNITS } from '@/types';
import {
  agentGetRecipe,
  agentListRecipes,
  agentPlanAdd,
  agentPlanMove,
  agentPlanRemove,
  agentPlanServings,
  agentShoppingAdd,
  agentShoppingCheck,
  agentShoppingRemove,
  agentWeek,
} from '@/lib/agent-ops';

// MCP tools over the same operations as the /api/agent REST endpoints.
// A fresh server is built per request (stateless transport) and bound to the
// household resolved from the bearer token, so tools can't name another one.

const DATE = z.string().describe('Date as YYYY-MM-DD');
const WEEK_DATE = z
  .string()
  .optional()
  .describe('Any YYYY-MM-DD inside the target week (weeks run Saturday→Friday). Default: today.');
const SLOT = z.enum(SLOTS).describe('Meal slot: "comida" = lunch, "cena" = dinner');
const ID = z.number().int().positive();

const CONTEXT =
  'Mealplan is a Spanish household meal planner. Weeks run Saturday to Friday. ' +
  'Slots: "comida" = lunch, "cena" = dinner. Dates are YYYY-MM-DD.';

function run(fn: () => unknown) {
  try {
    return { content: [{ type: 'text' as const, text: JSON.stringify(fn()) }] };
  } catch (err) {
    let message = 'internal error';
    if (err instanceof ZodError) message = `validation: ${err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`;
    else if (err instanceof NotFoundError) message = `not found: ${err.message}`;
    else console.error('[mcp]', err);
    return { isError: true, content: [{ type: 'text' as const, text: message }] };
  }
}

export function buildMcpServer(householdId: number): McpServer {
  const server = new McpServer({ name: 'mealplan', version: '1.0.0' }, { instructions: CONTEXT });
  const write = { readOnlyHint: false, openWorldHint: false };
  const read = { readOnlyHint: true, openWorldHint: false };

  server.registerTool(
    'mealplan_week',
    {
      description:
        `${CONTEXT} Returns the week's plan (each day with comida/cena entries, including entry_id and recipe_id) ` +
        'and the shopping list grouped by supermarket (each item has kind "recipe" or "extra" and an id). ' +
        'Call this first to get the ids the other tools need.',
      inputSchema: { date: WEEK_DATE },
      annotations: read,
    },
    ({ date }) => run(() => agentWeek(householdId, { date })),
  );

  server.registerTool(
    'mealplan_recipes',
    {
      description: 'List or search the household recipes by name (case-insensitive substring). Use it to find a recipe_id.',
      inputSchema: {
        q: z.string().optional().describe('Text to search in the recipe name, e.g. "lentejas". Omit to list all.'),
        favorites_only: z.boolean().optional(),
      },
      annotations: read,
    },
    (args) => run(() => agentListRecipes(householdId, args)),
  );

  server.registerTool(
    'mealplan_recipe',
    {
      description: 'Get one recipe with its ingredients, base servings, notes and tags.',
      inputSchema: { recipe_id: ID },
      annotations: read,
    },
    ({ recipe_id }) => run(() => agentGetRecipe(householdId, recipe_id)),
  );

  server.registerTool(
    'mealplan_plan_add',
    {
      description: `${CONTEXT} Add a recipe to a day and slot. A slot can hold several recipes. Returns the new entry_id.`,
      inputSchema: {
        date: DATE,
        slot: SLOT,
        recipe_id: ID.describe('From mealplan_recipes'),
        servings: z.number().positive().describe('Number of servings (raciones) to cook'),
      },
      annotations: write,
    },
    (args) => run(() => agentPlanAdd(householdId, args)),
  );

  server.registerTool(
    'mealplan_plan_move',
    {
      description: `${CONTEXT} Move a plan entry to another day and/or slot.`,
      inputSchema: { entry_id: ID.describe('From mealplan_week'), to_date: DATE, to_slot: SLOT },
      annotations: { ...write, idempotentHint: true },
    },
    (args) => run(() => agentPlanMove(householdId, args)),
  );

  server.registerTool(
    'mealplan_plan_servings',
    {
      description: 'Change the number of servings of a plan entry (the shopping list rescales).',
      inputSchema: { entry_id: ID.describe('From mealplan_week'), servings: z.number().positive() },
      annotations: { ...write, idempotentHint: true },
    },
    (args) => run(() => agentPlanServings(householdId, args)),
  );

  server.registerTool(
    'mealplan_plan_remove',
    {
      description: 'Remove an entry from the plan. Permanent: confirm with the user first.',
      inputSchema: { entry_id: ID.describe('From mealplan_week') },
      annotations: { ...write, destructiveHint: true },
    },
    ({ entry_id }) => run(() => agentPlanRemove(householdId, entry_id)),
  );

  server.registerTool(
    'mealplan_shopping_add',
    {
      description:
        `${CONTEXT} Add an extra item (not from a recipe) to the shopping list of the week containing date.`,
      inputSchema: {
        name: z.string().describe('Item name in Spanish, e.g. "Papel de cocina"'),
        date: WEEK_DATE,
        quantity: z.number().positive().optional(),
        unit: z.enum(UNITS).optional(),
        shopping_category: z.enum(SHOPPING_CATEGORIES).optional().describe('Default "otros"'),
        supermarket: z.string().optional().describe('Supermarket id, e.g. "mercadona", "lidl". Omit if unknown.'),
      },
      annotations: write,
    },
    (args) => run(() => agentShoppingAdd(householdId, args)),
  );

  server.registerTool(
    'mealplan_shopping_check',
    {
      description:
        'Tick or untick a shopping list item. kind and id come from the shopping list in mealplan_week.',
      inputSchema: {
        kind: z.enum(['recipe', 'extra']),
        id: ID,
        checked: z.boolean(),
        date: WEEK_DATE,
      },
      annotations: { ...write, idempotentHint: true },
    },
    (args) => run(() => agentShoppingCheck(householdId, args)),
  );

  server.registerTool(
    'mealplan_shopping_remove',
    {
      description: 'Remove an extra item (kind "extra") from the shopping list. Items from recipes cannot be removed here; change the plan instead.',
      inputSchema: { id: ID.describe('Extra id from mealplan_week') },
      annotations: { ...write, destructiveHint: true },
    },
    ({ id }) => run(() => agentShoppingRemove(householdId, id)),
  );

  return server;
}
