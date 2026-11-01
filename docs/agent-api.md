# Agent API

Access to the meal plan for AI agents that have no Google session (Eric's OpenBot "Majordomo", the Pixie "Cocina" agent). Two transports over the same operations (`src/lib/agent-ops.ts`): a REST API under `/api/agent` and an MCP server at `/api/mcp`.

## Auth

Every request needs:

```
Authorization: Bearer <MEALPLAN_AGENT_TOKEN>
```

- **The token reads and writes.** There is one token, no read-only variant: anyone holding `MEALPLAN_AGENT_TOKEN` can change the household's plan and shopping list (add, move, rescale and remove plan entries; add, tick and remove shopping extras; tick recipe items). Give it only to agents you trust to make those changes, and treat it like a password.
- Disabled (401) unless `MEALPLAN_AGENT_TOKEN` is set. Generate one with `openssl rand -hex 32` and put it in the host `.env`.
- The token maps to one household: `MEALPLAN_AGENT_HOUSEHOLD_ID` (default `1`, Casa Lehmann). Every read and write is scoped to it; ids from another household answer 404 and change nothing.
- `/api/agent` and `/api/mcp` are public in `src/middleware.ts`; the routes check the token themselves with a constant-time compare.
- Cloudflare Access sits in front of the public hostname, so agents on the LAN call the container directly.

Conventions: weeks run **Saturday → Friday** (the week key is the Saturday's date). Slots are `comida` (lunch) and `cena` (dinner). Dates are `YYYY-MM-DD`. Where an endpoint takes `date` for a week, any day of that week works (default: today).

Errors are JSON: `401 {"error":"unauthorized"}`, `400 {"error":"validation","issues":[…]}` (zod issues) or `{"error":"body must be JSON"}`, `404 {"error":"… not found …"}`.

## REST endpoints

| Method | Path | Body / query | Does |
|---|---|---|---|
| GET | `/api/agent/plan?date=` | | Legacy read: plan by name + plain-text shopping list (unchanged) |
| GET | `/api/agent/week?date=` | | Plan with `entry_id` / `recipe_id` + structured shopping list (`kind`, `id`, `parts`, `checked`) |
| GET | `/api/agent/recipes?q=&favorites=1` | | List/search recipes by name |
| GET | `/api/agent/recipes/:id` | | One recipe with ingredients |
| POST | `/api/agent/plan/entries` | `{ date, slot, recipe_id, servings }` | Add a recipe to a day/slot → `{ entry_id, … }` |
| PATCH | `/api/agent/plan/entries/:id` | `{ to_date, to_slot }` and/or `{ servings }` | Move and/or change servings (one transaction) |
| DELETE | `/api/agent/plan/entries/:id` | | Remove the entry (permanent) |
| POST | `/api/agent/shopping/extras` | `{ name, date?, quantity?, unit?, shopping_category?, supermarket? }` | Add an extra item → `{ kind: "extra", id, week }` |
| DELETE | `/api/agent/shopping/extras/:id` | | Remove an extra (soft: restorable in the app) |
| POST | `/api/agent/shopping/check` | `{ kind: "recipe"\|"extra", id, checked, date? }` | Tick/untick an item; `kind`/`id` come from `/week` |

Example `GET /api/agent/plan` response (legacy):

```json
{
  "week": "2026-10-31",
  "days": [{ "date": "2026-10-31", "comida": [{ "name": "…", "emoji": "…", "servings": 2 }], "cena": [] }],
  "shopping": "plain-text shopping list, same as /api/shopping/text"
}
```

## MCP server

Streamable HTTP, stateless, JSON responses: `POST http(s)://<host>/api/mcp`, same bearer token.

Tools: `mealplan_week`, `mealplan_recipes`, `mealplan_recipe`, `mealplan_plan_add`, `mealplan_plan_move`, `mealplan_plan_servings`, `mealplan_plan_remove`, `mealplan_shopping_add`, `mealplan_shopping_check`, `mealplan_shopping_remove`. Typical flow: `mealplan_recipes` (find `recipe_id`) → `mealplan_plan_add`; `mealplan_week` gives the `entry_id`s and shopping `kind`/`id`s the other tools need. Errors come back as tool results with `isError: true` and a `validation: …` or `not found: …` message.

Connect it as an http MCP entry (Claude Code / most clients):

```json
{
  "mcpServers": {
    "mealplan": {
      "type": "http",
      "url": "http://<container-host>:3000/api/mcp",
      "headers": { "Authorization": "Bearer ${MEALPLAN_AGENT_TOKEN}" }
    }
  }
}
```

Or with the CLI: `claude mcp add --transport http mealplan http://<container-host>:3000/api/mcp --header "Authorization: Bearer $MEALPLAN_AGENT_TOKEN"`.
