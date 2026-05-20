# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # http://localhost:3000
npm run build        # next build (output: 'standalone')
npm run start        # run built server (uses .next/standalone)
npm run lint         # next lint
npm run typecheck    # tsc --noEmit
npm run test         # vitest run (one shot)
npm run test:watch   # vitest watch

# Run a single test file
npx vitest run src/lib/__tests__/shopping.test.ts

# Regenerate PNG icons from /public/icon-maskable.svg
node scripts/generate-icons.mjs
```

Tests live at `src/**/__tests__/**/*.test.ts` (see `vitest.config.ts`). Tests that touch the DB set `process.env.DATABASE_PATH` to a temp file **before** importing any module that uses `@/lib/db` — the DB module is a global singleton and resolves its path lazily on first access.

Required env vars:
- `GEMINI_API_KEY` — `/api/chat` returns 500 without it.
- `AUTH_SECRET` + `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — NextAuth Google provider.
- `AUTH_URL` — base URL used when building invite links in `createInviteAction`.
- `MEALPLAN_OWNER_EMAIL` — email that auto-claims household id 1 on first sign-in (see "Owner claim" below).
- `DATABASE_PATH` — overrides default `./data/mealplan.db`.

## Architecture

### Stack

Next.js 15 (App Router) + React 19 + TypeScript, SQLite via `better-sqlite3`, NextAuth v5 (Google), TanStack Query for client-side mutations/refetch, `@dnd-kit` for drag-and-drop, Tailwind, Vitest. The app is a single-binary PWA deployed via Docker + Cloudflare Access.

`next.config.ts` keeps two non-negotiable settings: `output: 'standalone'` (Docker uses `.next/standalone`) and `serverExternalPackages: ['better-sqlite3']` (the native module must not be bundled).

### Layers (pages → actions/routes → models → db)

```
src/app/                Pages + API routes (App Router)
src/actions/            'use server' server actions (plan, recipes, shopping, household)
src/app/api/            JSON endpoints (import/export, chat SSE, search, etc.)
src/models/             SQL access (sync better-sqlite3). All take householdId.
src/lib/                db, auth, week math, shopping aggregation, scale, supermarkets
src/schemas/            Zod input schemas — single source for action/route validation
src/types/              Domain types + the canonical enum tuples (UNITS, RECIPE_CATEGORIES, etc.)
src/components/         Per-feature folders: plan, recipes, shopping, settings, chat, ui
migrations/             *.sql, applied in lexical order on boot (idempotent via _migrations)
seeds/                  ingredients.sql — only runs if ingredients table is empty
```

Server actions always call `requireHouseholdId()` first, parse input with a Zod schema from `src/schemas`, call a model function, then `revalidatePath('/')` and `revalidatePath('/shopping')` for plan-touching mutations (shopping is derived from the plan, so it must be revalidated together).

### Database singleton + migrations

`src/lib/db.ts` exports a `Proxy` around a lazily-initialized `better-sqlite3` instance cached on `globalThis` (survives Next dev HMR). On first access it:

1. Creates the DB file at `DATABASE_PATH` (default `./data/mealplan.db`).
2. Enables WAL + foreign keys.
3. Ensures `_migrations` table, then applies any `migrations/*.sql` (lex order) not already recorded, each inside a transaction.
4. Loads `seeds/ingredients.sql` **only** if the `ingredients` table is empty.

Never reach for an async DB call — `better-sqlite3` is synchronous by design. Wrap multi-statement work in `db.transaction(...)`.

### Auth + multi-tenancy

The app started single-user and was migrated to multi-tenant in migration `009_multi_tenant.sql`. Every row-owning table (`recipes`, `meal_plan`, `shopping_state`, `shopping_extras`) has a `household_id` column; the `ingredients` table stays global (shared catalog).

Two NextAuth configs by design (do not collapse them):

- `src/auth.config.ts` — **edge-safe** base, NO DB imports. Used by `src/middleware.ts` (which runs on the Edge runtime).
- `src/auth.ts` — full config with DB-backed `signIn` / `jwt` callbacks. Used by route handlers, server actions, and pages.

The JWT only carries `userId`. **Household membership is always re-resolved from the DB on every request** (see `readActiveMembership` in `src/lib/auth.ts`), because the JWT is stamped at sign-in and won't reflect a household created mid-session via `/welcome` or `/join/<token>`. Trusting the JWT here causes an infinite `/welcome` redirect loop.

**Use these auth helpers — don't reinvent:**
- `requireHouseholdIdOrRedirect()` — page-level gate: redirects to `/login` (no session) or `/welcome` (no household).
- `requireHouseholdId()` — server actions / API routes; throws if no session/household (assumes the page gate already ran).
- `requireUser()` / `getCurrentUser()` — when you need email/role, not just household id.

**Owner claim**: on first sign-in, if the user has no memberships and their email matches `MEALPLAN_OWNER_EMAIL`, they're attached as `owner` of household id 1 (`Casa Lehmann`, created by migration 009). This is how the original single-tenant data is rescued without manual SQL.

Every model function takes `householdId` as the first argument and scopes its WHERE / UPDATE / DELETE by it (e.g. `WHERE id = ? AND household_id = ?`). When adding new model functions, follow this pattern — a missing `household_id = ?` on a write is a cross-tenant bug.

### Week math: Saturday → Friday

The "week" runs **Saturday → Friday** (not ISO Monday → Sunday). The week key is the `YYYY-MM-DD` date of the Saturday opening the week. See `src/lib/week.ts` — `SATURDAY = 6` for date-fns' `weekStartsOn`. Use `getCurrentWeek`, `getWeekDates`, `getNextWeek`, `getPrevWeek` rather than rolling new date arithmetic.

### Enums + Zod

`src/types/index.ts` defines const tuples (`UNITS`, `RECIPE_CATEGORIES`, `RECIPE_TAGS`, `SLOTS`, `PACKAGED_UNITS`) that are the source of truth. `src/schemas/index.ts` builds Zod enums from those tuples — when adding a value, add it to the tuple in `src/types` and Zod picks it up automatically.

Notable units:
- `al_gusto` — pantry "to taste" (oil, salt, spices). Renders as "al gusto"; ignored when summing the shopping list.
- `PACKAGED_UNITS` (`ud`, `pieza`, `unidad`, `paquete`, `lata`, `bandeja`, `bolsa`, `brick`) — shopping totals in these units round **up** (1.5 cans → 2). Mass/volume (`g`/`ml`/`kg`/`l`) just trim precision — don't ceil 49g→50g.

`is_pantry` ingredients are excluded entirely from shopping aggregation in `generateShoppingList`.

### Shopping list

Derived, not stored. `generateShoppingList(householdId, week)` (in `src/lib/shopping.ts`) joins `meal_plan` × `recipe_ingredients` × `ingredients` for the week, scales each ingredient by `servings / base_servings`, aggregates by `(ingredient_id, unit)`, then overlays per-week `shopping_state` (checked/removed flags) and `shopping_extras` (ad-hoc items). Items are grouped by `supermarket` (catalog in `src/lib/supermarkets.ts`).

Shopping check/remove state is persisted in DB so two devices stay in sync — the `/shopping` page uses TanStack Query to refetch every 10s when visible.

### Recipe sharing

Recipes carry a nullable `share_token`. `/r/[token]` (in `PUBLIC_PATH_PREFIXES` in `src/middleware.ts`) renders a read-only view via `getRecipeByShareToken` — household is intentionally not exposed.

### Chat assistant (`/chat`)

SSE stream from `/api/chat/route.ts` to `@google/genai` (Gemini 2.5 Flash). The model calls a `save_recipe` tool; the route validates and emits a `recipe_draft` event. Saving the (possibly user-edited) draft is a **separate** POST to `/api/import` — the chat route never writes recipes itself. Per-user daily cap enforced via `chat_usage` table (`src/lib/chat-rate-limit.ts`). Full doc: [docs/chat-assistant.md](docs/chat-assistant.md).

### Recipe import

`POST /api/import` accepts three shapes (Zod union): one recipe, an array, or `{ recipes: [...] }`. The route also tolerates smart quotes and ` ```json ` fences via `sanitizeJsonText` before `JSON.parse`. Recipes whose name (case-insensitive) already exists are skipped. Ingredients are looked up by lowercase name via `findOrCreateIngredient` so they're never duplicated.

### Service worker

Intentionally minimal (`/public/sw.js`): network-first for `/shopping*` and `/api/shopping*`, cache-first for `/_next/static`. No IndexedDB / Background Sync mutation queueing.

## Conventions worth knowing

- Spanish UI strings throughout. Don't translate user-facing copy to English when editing — the audience is Spanish.
- `@/` is aliased to `src/` (tsconfig + vitest config).
- Pages that need fresh data are `export const dynamic = 'force-dynamic'`. Most plan/recipe/shopping pages are.
- Server actions should add `revalidatePath('/')` and `revalidatePath('/shopping')` for any plan mutation — both views render off the same data.
- When mutating `recipes` / `recipe_ingredients` / `recipe_tags`, the parent recipe write must check `household_id = ?` and use `res.changes === 0 → throw` to catch cross-tenant attempts; children cascade via FK.
- Don't add a `cd <dir> &&` prefix in front of git commands when committing — the working directory is already correct.
