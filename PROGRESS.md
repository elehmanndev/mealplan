# MealPlan — Build Status

**Status: v1 complete and verified locally. Plan view redesigned to a fixed-viewport calendar grid.**

Last update: 2026-05-02.

## Plan view layout (current)

The home `/` view is a **calendar grid** that fills the viewport without scrolling:

- Outer page: `flex flex-col h-dvh pb-20` (so grid sits between sticky `WeekNav` and the fixed `BottomNav` with breathing room).
- Inner grid container: `flex-1 min-h-0 px-3 pt-5 pb-5`.
- Grid: `gridTemplateColumns: '52px repeat(2, minmax(0, 1fr))'`, `gridTemplateRows: 'auto repeat(7, minmax(0, 1fr))'`.
- Top row: empty cell + "🥘 COMIDA" + "🌙 CENA" labels.
- Each of 7 day rows: day-initial + number on the left (highlighted accent if today), then comida/cena slot cells.
- Slot cells: `h-full` (no longer fixed `h-16`), so they stretch to whatever 1fr resolves to.
- DraggablePlanCard renders compact: emoji + recipe name (clamped 2 lines) + "Np" servings.
- Empty slot: dashed border + centered `+`.

Files involved (still these — only their internal markup changed):
- `src/app/page.tsx`
- `src/components/plan/WeekView.tsx`
- `src/components/plan/PlanSlot.tsx`
- `src/components/plan/DraggablePlanCard.tsx`
- `src/lib/week.ts` (added `formatDayInitial`, `formatDayNumber`)

`DaySection.tsx` is no longer used by `WeekView` (orphaned but kept for reference).

## Demo data

`scripts/seed-demo.mjs` populates 8 sample recipes and ~12 plan entries for the current ISO week. Run with `node scripts/seed-demo.mjs`. Wipes `meal_plan` first; recipes are appended (not deduped against existing).



## Verification

- `npm install` — ok (better-sqlite3 12.9.0 + Node 24 prebuilds work)
- `npx tsc --noEmit` — clean (no errors)
- `npm test` — 19/19 tests passing (scale, week including W53/year boundary, shopping list aggregation)
- `npm run build` — succeeds, all 10 routes built (3 static, 7 dynamic). Standalone output ready for Docker.
- `npm run dev` — all routes return 200:
  - `/`, `/recipes`, `/recipes/new`, `/recipes/[id]`, `/recipes/[id]/edit`, `/shopping`
  - `/api/recipes`, `/api/ingredients/search`, `/api/shopping/text`
  - `/manifest.webmanifest`, `/sw.js`
- DB auto-initializes at `./data/mealplan.db` with WAL, foreign_keys ON, migrations applied, ingredients seeded (49 rows).

## Notable build-time fixes applied

- `better-sqlite3` bumped to `^12.9.0` (Node 24 prebuilds; older versions tried to compile from source on Windows).
- `next` bumped to `^15.5.15` (CVE-2025-66478 patch).
- Split `SHOPPING_CATEGORIES` and shopping types into `src/lib/shopping-types.ts` (no DB imports). Client components and `schemas/index.ts` now import from there. `src/lib/shopping.ts` re-exports for server callers. This stops the client bundle from pulling in `better-sqlite3 → node:fs/path`.

## Next steps for Eric

1. **PWA icons** — drop real PNGs into `/public` per `public/README-icons.txt` (`icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`). Until then the install banner won't show.
2. **Smoke test on mobile** — open `/` in Chrome DevTools device emulation (iPhone 13 Pro / Pixel 7), verify drag-and-drop on a slot card with the week populated, and check `touch-action: manipulation` doesn't block scroll.
3. **Deploy** — `docker compose build && docker compose up -d` on Unraid. NPM proxy host → Cloudflare Tunnel → Cloudflare Access policy. Steps in `README.md`.
4. **First-run** — DB starts empty (just ingredients seeded). Add a few recipes via `/recipes/new`, then drag them onto days.

## File map (final)

```
mealplan/
├── Dockerfile, docker-compose.yml, README.md
├── MEALPLAN-CLAUDE-CODE.md           — original brief
├── PROGRESS.md                        — this file
├── package.json, next.config.ts, tsconfig.json,
│   tailwind.config.ts, postcss.config.js, vitest.config.ts
├── migrations/001_init.sql
├── seeds/ingredients.sql
├── public/manifest.webmanifest, sw.js, README-icons.txt
└── src/
    ├── app/
    │   ├── layout.tsx, providers.tsx, globals.css
    │   ├── page.tsx                   — week view
    │   ├── recipes/{page,new/page,[id]/page,[id]/edit/page}.tsx
    │   ├── shopping/page.tsx
    │   └── api/
    │       ├── ingredients/search/route.ts
    │       ├── recipes/route.ts
    │       └── shopping/text/route.ts
    ├── components/
    │   ├── plan/{WeekView, WeekNav, DaySection, PlanSlot,
    │   │         DraggablePlanCard, RecipePicker, ContextMenu,
    │   │         DaySlotPicker, WeekActionsMenu}.tsx
    │   ├── recipes/{RecipeCard, FavoriteToggle, RecipeMenu,
    │   │            ServingsView, RecipeDetailClient,
    │   │            AddToPlanButton, RecipeForm,
    │   │            IngredientRepeater}.tsx
    │   ├── shopping/{ShoppingHeader, ShoppingActionsMenu,
    │   │             ShoppingList, ShoppingListItem,
    │   │             AddExtraSheet, AddExtraButton}.tsx
    │   └── ui/{Button, BottomSheet, BottomNav, Stepper}.tsx
    ├── lib/
    │   ├── db.ts                      — singleton, migrations, seeds
    │   ├── auth.ts                    — Cf-Access header
    │   ├── week.ts                    — date-fns wrapper
    │   ├── scale.ts                   — humane rounding
    │   ├── shopping.ts                — DB-driven, generateShoppingList, shoppingListToText
    │   ├── shopping-types.ts          — client-safe constants/types
    │   └── __tests__/{scale, week, shopping}.test.ts
    ├── models/{recipe, ingredient, plan}.ts
    ├── actions/{plan, recipes, shopping}.ts
    ├── schemas/index.ts               — Zod
    └── types/index.ts
```

## Roadmap delivered (vs §10 of the brief)

1. ✅ Boilerplate Next.js + Tailwind + dark theme + `output: 'standalone'` + `serverExternalPackages`
2. ✅ DB + migrations + seeds + `lib/db.ts` (singleton, WAL, FK on)
3. ✅ Models + types
4. ✅ CRUD recetas + toggle favorito + duplicar
5. ✅ Repeater de ingredientes + autocomplete `/api/ingredients/search`
6. ✅ Vista semanal vertical + bottom nav
7. ✅ RecipePicker + filtro favoritos
8. ✅ ContextMenu (editar comensales, mover, duplicar, ver, eliminar)
9. ✅ Drag-and-drop con @dnd-kit (Touch + Mouse + Keyboard sensors, swap on collision, optimistic UI). Mobile real-device test pending.
10. ✅ Vista de receta con `ServingsStepper` y reescalado client-side
11. ✅ Lista de compra DB-backed + items ad-hoc + tests unitarios
12. ✅ WeekActionsMenu — duplicar semana anterior + limpiar semana
13. ✅ PWA — manifest, sw.js (network-first /shopping*, cache-first /_next/static; offline mutation queue is a documented future)
14. ✅ Dockerfile + docker-compose + smoke test local
15. ✅ Deploy Unraid — container `mealplan` running on `192.168.1.45:3004` (host-port 3004 because mcphub holds 3001). NPM proxy + Cloudflare Access still pending Eric's side.
