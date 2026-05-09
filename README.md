# MealPlan

Personal weekly meal-planning PWA with recipe book, drag-and-drop scheduling, and auto-generated shopping list. Mobile-first, dark mode, offline-capable for the shopping list.

Single-tenant. Auth handled by Cloudflare Access in front of the subdomain — the app reads `cf-access-authenticated-user-email`.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- SQLite via `better-sqlite3`
- Tailwind CSS + lucide-react
- `@dnd-kit` for drag-and-drop
- TanStack Query (client mutations / refetch)
- `date-fns` for ISO week math
- Vitest for unit tests
- Docker + Cloudflare Tunnel + NPM (Unraid)

## Development

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck
npm run test
npm run build
```

The DB is created at `./data/mealplan.db` on first boot. Migrations from `migrations/` run automatically (idempotent via `_migrations` table). Seeds (`seeds/ingredients.sql`) load only if the `ingredients` table is empty.

Override the DB path with `DATABASE_PATH=/some/other/path.db`.

## PWA icons

`/public/icon-maskable.svg` is the source. PNG icons (`apple-touch-icon`, `icon-192`, `icon-512`, `icon-512-maskable`) are generated from it via:

```bash
node scripts/generate-icons.mjs
```

Re-run after editing the SVG. Wordmark renders client-side from `src/components/ui/Wordmark.tsx` (inline gradient SVG, no asset).

## Settings & data portability

`/settings` exposes:

- **Apariencia** — segmented Dark / Light theme picker (persists in `localStorage.theme`).
- **Datos** — `Exportar copia` (downloads `mealplan-backup-YYYY-MM-DD.json` from `/api/export`, dumps every table) and `Importar recetas` (paste a JSON, server validates with zod and merges).
- **Acerca de** — version row read from `package.json` at build time.

### Recipe import format

`POST /api/import` accepts three shapes (zod union): a single recipe object, an array of recipes, or `{ "recipes": [...] }`. Recipes whose name (case-insensitive) already exists are skipped. Ingredients are looked up by lowercase name (`findOrCreateIngredient`) so they're never duplicated. Missing optional fields fall back to sensible defaults (`emoji: '🍽️'`, `servings: 2`, `shopping_category: 'otros'`). The route also tolerates smart quotes (`"` `"`) and ` ```json ` fences before parsing.

The import sheet has a "Copiar prompt para ChatGPT" button — copies a Spanish prompt enumerating every valid `unit`, `category`, `shopping_category`, `tag`, and `supermarket` value, so ChatGPT produces directly importable JSON. See `CHATGPT_PROMPT` in [src/components/settings/DataActions.tsx](src/components/settings/DataActions.tsx).

## Chat assistant

`/chat` is a Gemini-powered conversational UI for adding recipes in natural Spanish. The assistant fills `name`/`emoji`/`category`/`description` itself and asks the user only for `servings`, `prep_time_min`, and per-ingredient quantity/unit/supermarket. Pantry items (oil, salt, spices) get the `al_gusto` unit and are excluded from shopping aggregation. Streaming SSE, markdown rendering, mic button as a hint to the keyboard's native dictation. Requires `GEMINI_API_KEY` env var. Full design + ops doc in [docs/chat-assistant.md](docs/chat-assistant.md).

## Production build / Docker

```bash
docker compose build
docker compose up -d
```

Container exposes 3000; compose maps it to 3001 on the host. SQLite file lives in the bind-mounted volume `/mnt/user/appdata/mealplan/data` (Unraid path — adjust for other hosts).

## Deploy

**Live at `https://mealplan.elehmann.dev`** — Cloudflare Tunnel → `***REDACTED-LAN-IP***:3004` on Unraid, Cloudflare Access in front (One-Time PIN, two-email allowlist).

**Pushes to `main` auto-deploy** in ~50 seconds via the `mealplan-webhook` container on Unraid (HMAC-validated). Full pipeline doc + bootstrap + secret-rotation procedure in [docs/auto-deploy.md](docs/auto-deploy.md).

For a one-off rebuild without going through GitHub: `ssh unraid 'cd /mnt/user/appdata/mealplan && docker compose up -d --build'`.

## Project map

```
src/
  app/                 routes (App Router)
    page.tsx           /        — week view
    recipes/           /recipes — book + CRUD
    shopping/          /shopping — list
    api/               internal JSON endpoints
  components/
    plan/              week view, DnD, RecipePicker, ContextMenu
    recipes/           list, detail, form, ingredient repeater
    shopping/          list, item with long-press, AddExtra
    ui/                BottomSheet, BottomNav, Button, Stepper
  lib/                 db, auth, week (date-fns), scale, shopping
  models/              recipe, ingredient, plan (sync better-sqlite3)
  actions/             server actions (plan, recipes, shopping)
  schemas/             Zod input validation
  types/               domain types + enums
migrations/            *.sql, applied in lexical order
seeds/                 ingredients seed
public/                manifest, sw.js, icons
```

## Notes

- `next.config.ts` has `output: 'standalone'` and `serverExternalPackages: ['better-sqlite3']`. Don't remove either.
- The DB connection in `src/lib/db.ts` is a singleton cached on `globalThis` to survive Next dev HMR.
- Shopping state (checks, removed flags, ad-hoc items) lives in DB so two devices stay in sync — TanStack Query refetches every 10s when the page is visible.
- The service worker is intentionally minimal: network-first for `/shopping*` and `/api/shopping*`, cache-first for `/_next/static`. Offline mutation queueing via IndexedDB / Background Sync is a future enhancement.
