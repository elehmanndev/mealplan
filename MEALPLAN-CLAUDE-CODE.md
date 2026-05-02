# MealPlan — Brief para Claude Code

App personal de planificación de comidas semanales con recetario, drag-and-drop entre días, y generador de lista de compra. **Mobile-first PWA**. Uso doméstico (Eric + pareja, mismo tablero compartido).

**Owner:** Eric Lehmann
**Subdominio:** `mealplan.elehmann.dev`
**Hosting:** Unraid Docker (NPM + Cloudflare Tunnel ya configurados)
**Repo:** GitHub `mealplan` (privado)
**Auth:** Cloudflare Access delante del subdominio (la app NO implementa auth)

---

## 1. Stack

| Capa | Tecnología |
|------|------------|
| Framework | **Next.js 15 (App Router)** |
| Lenguaje | TypeScript |
| UI | React 19 |
| Drag & Drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Estilos | Tailwind CSS |
| DB | SQLite con `better-sqlite3` |
| Fechas | `date-fns` (ISO week safe) |
| Mutations | TanStack Query (React Query) |
| Validación | Zod |
| Iconos | `lucide-react` |
| PWA | manifest + meta tags + service worker (cache de `/shopping` para uso offline en supermercado) |
| Auth | Cloudflare Access (lee header `Cf-Access-Authenticated-User-Email`) |
| Deploy | Docker container en Unraid |

**Reglas duras:**
- App Router (no Pages Router)
- UI siempre en español
- Dark mode por defecto
- **Mobile-first** — desktop es secundario, basta con que no rompa
- Touch targets mínimo 44×44 px

---

## 2. Auth — Cloudflare Access

La app NO valida usuarios. Cloudflare Access intercepta antes del container. Eric y su pareja comparten el mismo tablero y recetario (single-tenant, ambos editan lo mismo).

**Setup en Cloudflare Zero Trust (lo hace Eric):**
1. Access → Applications → Add → Self-hosted
2. Application domain: `mealplan.elehmann.dev`
3. Policy "Allow": Include → Emails → email Eric + email pareja
4. Identity providers: Google OAuth + One-time PIN
5. Session duration: 1 month
6. DNS de `mealplan.elehmann.dev` **proxied (naranja)** en Cloudflare
7. Cloudflare Tunnel ya existente apunta a NPM en Unraid

**En la app:**
```ts
// src/lib/auth.ts
import { headers } from 'next/headers';
export async function getCurrentUser() {
  const h = await headers();
  return h.get('cf-access-authenticated-user-email') ?? 'dev@local';
}
```

---

### 2.1 `next.config.ts` — config crítica

`better-sqlite3` es un módulo nativo y **rompe el build** si Webpack/Turbopack intenta empaquetarlo. Marcarlo como external desde el día 1:

```ts
// next.config.ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',                          // imagen Docker ~10× más pequeña
  serverExternalPackages: ['better-sqlite3'],    // imprescindible
  experimental: {
    // ...
  },
};

export default config;
```

### 2.2 `lib/db.ts` — singleton (evita "database is locked" en dev)

```ts
// src/lib/db.ts
import Database from 'better-sqlite3';

const globalForDb = globalThis as unknown as { db?: Database.Database };

export const db = globalForDb.db ?? (() => {
  const instance = new Database(process.env.DATABASE_PATH ?? './data/mealplan.db');
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');
  // ejecutar migraciones aquí (idempotente vía tabla _migrations)
  return instance;
})();

if (process.env.NODE_ENV !== 'production') globalForDb.db = db;
```

**Acceso puntual de invitados (ej: suegra haciendo la compra):** Eric añade temporalmente el email a la policy y lo quita después. No es feature de la app.

---

## 3. Estructura del proyecto

```
mealplan/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root: TanStack provider, dark theme, manifest
│   │   ├── page.tsx                # Vista semanal (mobile-first)
│   │   ├── recipes/
│   │   │   ├── page.tsx            # Lista de recetas (grid 2 cols)
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Detalle con escalado
│   │   │       └── edit/page.tsx
│   │   ├── shopping/page.tsx       # Lista de compra
│   │   └── api/
│   │       ├── plan/route.ts
│   │       ├── recipes/route.ts
│   │       └── ingredients/search/route.ts
│   ├── components/
│   │   ├── plan/
│   │   │   ├── WeekView.tsx        # 'use client' — vertical, dnd-kit
│   │   │   ├── DaySection.tsx
│   │   │   ├── PlanSlot.tsx
│   │   │   ├── RecipePicker.tsx
│   │   │   ├── ContextMenu.tsx
│   │   │   ├── WeekActionsMenu.tsx # Sheet con duplicar/limpiar semana
│   │   │   └── WeekNav.tsx
│   │   ├── recipes/
│   │   │   ├── RecipeCard.tsx      # Incluye toggle favorito ⭐
│   │   │   ├── RecipeForm.tsx
│   │   │   ├── ServingsStepper.tsx
│   │   │   └── FavoriteToggle.tsx
│   │   ├── shopping/
│   │   │   ├── ShoppingList.tsx
│   │   │   └── ShoppingItem.tsx    # Tap = check, long-press = eliminar
│   │   └── ui/
│   │       ├── BottomSheet.tsx
│   │       ├── BottomNav.tsx
│   │       └── Button.tsx
│   ├── lib/
│   │   ├── db.ts                   # singleton + WAL + foreign_keys
│   │   ├── auth.ts
│   │   ├── week.ts                 # wrapper sobre date-fns
│   │   ├── scale.ts
│   │   ├── shopping.ts
│   │   └── __tests__/              # week.test.ts, scale.test.ts, shopping.test.ts
│   ├── models/
│   │   ├── recipe.ts
│   │   ├── ingredient.ts
│   │   └── plan.ts                 # add, move, duplicate, remove, duplicateWeek, clearWeek
│   ├── actions/
│   │   ├── plan.ts
│   │   ├── recipes.ts              # toggleFavorite, duplicateRecipe
│   │   └── shopping.ts             # toggleCheck, removeItem, resetChecks, addExtra, toggleExtra
│   ├── schemas/index.ts
│   └── types/index.ts
├── data/                           # Volume mount
├── migrations/001_init.sql
├── seeds/ingredients.sql
├── public/
│   ├── manifest.webmanifest
│   ├── sw.js                       # service worker (cache-first /shopping, queue offline mutations)
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
├── Dockerfile
├── docker-compose.yml
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── README.md
```

---

## 4. Base de datos

```sql
-- migrations/001_init.sql

CREATE TABLE recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT NOT NULL DEFAULT '🍽️',
  base_servings INTEGER NOT NULL DEFAULT 2,
  category TEXT,
  prep_time_min INTEGER,
  notes TEXT,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  default_unit TEXT NOT NULL,
  shopping_category TEXT NOT NULL
);

CREATE TABLE recipe_ingredients (
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  PRIMARY KEY (recipe_id, ingredient_id)
);

CREATE TABLE meal_plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('comida', 'cena')),
  recipe_id INTEGER NOT NULL REFERENCES recipes(id),
  servings REAL NOT NULL CHECK (servings > 0),
  UNIQUE (date, slot)
);

-- Estado compartido de la lista de compra (Eric + pareja, varios devices)
CREATE TABLE shopping_state (
  week TEXT NOT NULL,                 -- "2025-W47"
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
  checked INTEGER NOT NULL DEFAULT 0,
  removed INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (week, ingredient_id)
);

-- Items ad-hoc (papel higiénico, comida del gato, etc.)
CREATE TABLE shopping_extras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity REAL,
  unit TEXT,
  shopping_category TEXT NOT NULL DEFAULT 'otros',
  checked INTEGER NOT NULL DEFAULT 0,
  removed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_meal_plan_date ON meal_plan(date);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipes_favorite ON recipes(is_favorite);
CREATE INDEX idx_shopping_state_week ON shopping_state(week);
CREATE INDEX idx_shopping_extras_week ON shopping_extras(week);
```

**Listas hardcoded en código:**
- Categorías de receta: `pasta`, `arroz`, `carne`, `pescado`, `ensalada`, `verdura`, `legumbres`, `huevos`, `sopa`, `otros`
- Categorías de shopping (orden importa): `verduras`, `frutas`, `carne`, `pescado`, `lacteos`, `panaderia`, `despensa`, `congelado`, `bebidas`, `otros`
- Unidades: `g`, `kg`, `ml`, `l`, `ud`, `cucharada`, `cucharadita`, `pellizco`, `taza`, `diente`

---

## 5. UX / Pantallas (mobile-first)

### 5.1 Vista principal `/` — Calendario semanal (grid 7×2)

```
┌─────────────────────────────────┐
│   <  Sem. 18  Hoy   >       ⋮   │ ← sticky header (⋮ = WeekActionsMenu)
├─────────────────────────────────┤
│         🥘 COMIDA   🌙 CENA      │ ← row de etiquetas
│  L  ┌──────────┐ ┌──────────┐   │
│  27 │🐟 Salmón │ │🥘 Lentejas│   │
│     │   2p     │ │    2p     │   │
│     └──────────┘ └──────────┘   │
│  M  ┌──────────┐ ┌──────────┐   │
│  28 │🍳 Tortilla│ │    +     │   │
│     │   2p     │ └──────────┘   │
│     └──────────┘                │
│  ...                             │
│ ┌S 2┐ ◀ HOY (fondo accent)      │
│  D  ┌──────────┐ ┌──────────┐   │
│  3  │🥣 Crema  │ │🐟 Salmón  │   │
│     └──────────┘ └──────────┘   │
├─────────────────────────────────┤
│ [📅 Plan] [📖 Recetas] [🛒 Lista]│ ← bottom nav fijo
└─────────────────────────────────┘
```

**Layout:**
- Grid `52px / 1fr / 1fr` columnas (etiqueta de día + dos cells de slot por fila).
- 8 filas: header "🥘 COMIDA / 🌙 CENA" (auto) + 7 filas de día (cada una `1fr` → reparten el espacio vertical disponible).
- El contenedor padre (`<main>`) es `flex flex-col h-dvh pb-20` para que el grid llene exactamente el viewport entre el WeekNav y la BottomNav, con respiro arriba/abajo (`pt-5 pb-5`).
- No hay scroll vertical: la semana entera cabe en la pantalla.

**Comportamiento:**
- Header sticky con flechas de navegación entre semanas + botón "Hoy" (lleva a la semana actual) + botón "⋮" (acciones de semana).
- Etiqueta de día izquierda: inicial L/M/X/J/V/S/D + número de día.
- Cada slot vacío: tap en "+" abre **RecipePicker** (bottom sheet).
- Cada slot con receta:
  - **Tap corto:** abre **ContextMenu** (bottom sheet con acciones).
  - **Long-press (200ms):** activa drag mode (vibración háptica vía `navigator.vibrate(50)`).
  - **Drag:** mover a otro slot (cualquier día/slot). Si el destino está ocupado, **intercambiar**.
- Día actual: la etiqueta de día tiene fondo `accent/15` y texto accent; los dos slots muestran un `ring-1 ring-accent/30` sutil.
- Bottom nav fijo con 3 entradas: "Plan", "Recetas", "Lista de compra" (cada una conserva la semana actualmente visible).

### 5.2 WeekActionsMenu (bottom sheet, botón "⋮" del header)

Acciones:
- **Duplicar semana anterior aquí** — copia todos los entries de la semana N-1 a la actual. Si la actual tiene entries, sub-confirm "¿Reemplazar o cancelar?"
- **Limpiar semana** — borra todos los entries de la semana visible (con confirm)

### 5.3 RecipePicker (bottom sheet)

- Animación slide-up estilo iOS
- Buscador sticky arriba con autofocus
- **Chips horizontales scrollables:** primer chip "⭐ Favoritos", luego las categorías
- Grid 2 columnas de cards: emoji grande, nombre, `{prep_time}min`, `{base_servings} pax`, **icono ⭐ arriba derecha si es favorita**
- Tap en card → abre sub-sheet con **ServingsStepper** (botones − / + grandes, default = `base_servings`) y botón "Añadir"

### 5.4 ContextMenu (bottom sheet, slot ocupado)

Acciones:
- Editar comensales (abre stepper)
- Mover a... (abre selector de día/slot)
- Duplicar a... (abre selector de día/slot)
- Ver receta
- Eliminar del plan (con confirm)

### 5.5 `/recipes` — Recetario

- Grid 2 columnas mobile, cards cuadradas
- Buscador sticky arriba + chips de categoría (primer chip "⭐ Favoritos")
- Cada card: tap en ⭐ arriba derecha = toggle favorito (sin entrar al detalle, optimistic update)
- FAB abajo derecha: "+" → `/recipes/new`

### 5.6 `/recipes/[id]` — Detalle

- Header: botón "←" + ⭐ toggle + "⋮" menú (Editar, Duplicar, Eliminar)
- Emoji grande centrado + nombre + categoría badge
- **ServingsStepper** prominente. Al cambiar, ingredientes se reescalan client-side instantáneo.
- Lista de ingredientes: `{cantidad} {unidad}` en negrita + nombre
- Descripción + notas
- Botón sticky abajo: "Añadir al plan" (abre selector de día/slot)

### 5.7 `/recipes/new` y `/recipes/[id]/edit`

Form con:
- Nombre (input)
- Emoji (input texto, sin selector visual)
- Categoría (select)
- Comensales base (stepper, default 2)
- Tiempo prep (input number minutos, opcional)
- Descripción (textarea, opcional)
- Notas (textarea, opcional)
- Toggle "⭐ Favorita"
- **Repeater de ingredientes:**
  - Cada fila: nombre con autocomplete (debounced 300ms vs `/api/ingredients/search`), cantidad (input `inputmode="decimal"` que acepta `,` y `.`), unidad (select)
  - Si el ingrediente no existe en la BD, mostrar select inline de `shopping_category` y crear con `findOrCreate` al guardar
  - Botón "+ Añadir ingrediente" abajo
  - Botón "X" por fila

### 5.8 `/shopping?week=YYYY-WW` — Lista de la compra

- Header: "Lista de compra — Semana 47" + botón "⋮" (Copiar al portapapeles, Reset checks, Mostrar eliminados)
- Grupos por `shopping_category` en orden fijo (verduras → frutas → carne → ...)
- Cada grupo es un acordeón colapsable
- Cada item:
  - **Tap:** toggle check (strikethrough cuando checked) — server action, optimistic update
  - **Long-press:** eliminar de la lista (con vibración háptica de confirm) — server action
- Item visualmente: `{cantidad} {unidad} {nombre}`
- **Estado compartido en DB** (`shopping_state` y `shopping_extras`): Eric y pareja ven los checks en tiempo real entre devices. Refetch cada 10s mientras la página está visible (TanStack Query `refetchInterval`).
- **Items ad-hoc:** botón "+ Añadir item" al final → bottom sheet con nombre, cantidad opcional, unidad opcional, categoría. Se guarda en `shopping_extras` y aparece en su grupo.
- **Offline:** la página se sirve desde service worker cuando no hay red (los checks que se hagan offline se sincronizan al recuperar conexión vía cola en IndexedDB — ver §7).

---

## 6. Lógica clave

### 6.1 Escalado con redondeo humano

```ts
// src/lib/scale.ts
export function scaleQuantity(
  baseQuantity: number,
  baseServings: number,
  targetServings: number
): number {
  const scaled = baseQuantity * (targetServings / baseServings);
  if (scaled >= 10) return Math.round(scaled);
  if (scaled >= 1) return Math.round(scaled * 10) / 10;
  return Math.round(scaled * 100) / 100;
}
```

### 6.2 Semana ISO 8601

Implementar con `date-fns` (`getISOWeek`, `getISOWeekYear`, `setISOWeek`, `startOfISOWeek`, `addWeeks`). **No rodar lógica propia** — los edge cases en cambios de año (W52/W53/W01) son sutiles. 2026 tiene W53.

```ts
// src/lib/week.ts
export function getCurrentWeek(): string;       // "2025-W47"
export function getWeekDates(week: string): Date[]; // 7 dates desde lunes
export function getNextWeek(week: string): string;
export function getPrevWeek(week: string): string;
export function formatDate(date: Date): string;   // "YYYY-MM-DD"
export function formatDayLabel(date: Date): string; // "LUNES 17 nov"
```

**Tests unitarios obligatorios** (`src/lib/__tests__/week.test.ts`): cambio de año normal, año con W53 (2026), año empezando en jueves (2026 empieza jueves → W01 contiene días de 2025).

### 6.3 Generación de lista de compra

```ts
// src/lib/shopping.ts
export function generateShoppingList(weekStr: string) {
  const dates = getWeekDates(weekStr);
  const meals = db.prepare(`
    SELECT mp.servings, r.id as recipe_id, r.base_servings
    FROM meal_plan mp JOIN recipes r ON r.id = mp.recipe_id
    WHERE mp.date BETWEEN ? AND ?
  `).all(formatDate(dates[0]), formatDate(dates[6]));

  const totals = new Map();

  for (const meal of meals) {
    const ratio = meal.servings / meal.base_servings;
    const ings = db.prepare(`
      SELECT ri.quantity, ri.unit, i.id, i.name, i.shopping_category
      FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = ?
    `).all(meal.recipe_id);

    for (const ing of ings) {
      const key = `${ing.id}-${ing.unit}`;
      const existing = totals.get(key) ?? { ...ing, quantity: 0 };
      existing.quantity += ing.quantity * ratio;
      totals.set(key, existing);
    }
  }

  const ordered = ['verduras','frutas','carne','pescado','lacteos','panaderia','despensa','congelado','bebidas','otros'];
  return ordered.map(cat => ({
    category: cat,
    items: [...totals.values()]
      .filter(t => t.shopping_category === cat)
      .sort((a, b) => a.name.localeCompare(b.name))
  })).filter(g => g.items.length > 0);
}
```

### 6.4 Drag-and-drop con @dnd-kit

```tsx
// components/plan/WeekView.tsx
'use client';

<DndContext
  sensors={[useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })]}
  onDragStart={() => navigator.vibrate?.(50)}
  onDragEnd={handleDragEnd}
>
  {weekDates.map(date => (
    <DaySection key={date} date={date}>
      {(['comida', 'cena'] as const).map(slot => (
        <DroppableSlot key={`${date}-${slot}`} id={`${date}-${slot}`}>
          {planEntry && (
            <DraggableSlot id={planEntry.id}>
              <PlanCard entry={planEntry} onTap={() => openContextMenu(planEntry)} />
            </DraggableSlot>
          )}
        </DroppableSlot>
      ))}
    </DaySection>
  ))}
</DndContext>
```

`movePlanEntry` server action: si target ocupado, **intercambia** ambas entries (UPDATE en transacción). Si vacío, simple UPDATE.

**⚠️ Testear en mobile real desde el primer día con la lista completa de 7 días.** El `TouchSensor` con `delay: 200ms` puede entrar en conflicto con el scroll vertical de la página: si el long-press se activa al intentar hacer scroll, frustra. Mitigaciones si pasa:
- `touch-action: manipulation` en el draggable
- subir `tolerance` a 8-10px
- considerar `PointerSensor` en lugar de `TouchSensor` (delegar al browser la decisión scroll vs drag)

Si tras tunear sigue dando guerra, fallback: drag se activa solo desde un "handle" visible (icono ⋮⋮ en la card) en lugar de long-press en toda la card.

### 6.5 Server Actions

```ts
// src/actions/plan.ts
'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function addToPlan(input) { /* ... */ }
export async function movePlanEntry(input) { /* move o swap */ }
export async function duplicatePlanEntry(input) { /* ... */ }
export async function removeFromPlan(id: number) { /* ... */ }

// Quick win 2: duplicar/limpiar semana
export async function duplicateWeek(fromWeek: string, toWeek: string, replace: boolean) {
  // Si replace=true, DELETE de toWeek primero
  // INSERT seleccionando de fromWeek con dates ajustadas
  // Todo en transacción
  revalidatePath('/');
}

export async function clearWeek(week: string) {
  const dates = getWeekDates(week);
  db.prepare('DELETE FROM meal_plan WHERE date BETWEEN ? AND ?')
    .run(formatDate(dates[0]), formatDate(dates[6]));
  revalidatePath('/');
}

// src/actions/recipes.ts
export async function toggleFavorite(recipeId: number) {
  db.prepare('UPDATE recipes SET is_favorite = 1 - is_favorite WHERE id = ?').run(recipeId);
  revalidatePath('/recipes');
  revalidatePath(`/recipes/${recipeId}`);
}

export async function duplicateRecipe(recipeId: number) {
  // Copia receta + ingredientes en transacción, sufijo " (copia)" en el nombre, is_favorite=0
  // Devuelve el nuevo id para redirigir a /recipes/[newId]/edit
  const tx = db.transaction((id: number) => {
    const orig = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id) as any;
    const res = db.prepare(`
      INSERT INTO recipes (name, description, emoji, base_servings, category, prep_time_min, notes, is_favorite)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(`${orig.name} (copia)`, orig.description, orig.emoji, orig.base_servings, orig.category, orig.prep_time_min, orig.notes);
    const newId = Number(res.lastInsertRowid);
    db.prepare(`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
      SELECT ?, ingredient_id, quantity, unit FROM recipe_ingredients WHERE recipe_id = ?
    `).run(newId, id);
    return newId;
  });
  const newId = tx(recipeId);
  revalidatePath('/recipes');
  return newId;
}
```

### 6.6 Shopping state — DB + sync entre devices

Estado compartido entre Eric y pareja: **server actions sobre `shopping_state` y `shopping_extras`**, no `localStorage`. TanStack Query con `refetchInterval: 10_000` mientras la pestaña está visible mantiene devices sincronizados sin WebSockets.

```ts
// src/actions/shopping.ts
'use server';

export async function toggleCheck(week: string, ingredientId: number, checked: boolean) {
  db.prepare(`
    INSERT INTO shopping_state (week, ingredient_id, checked, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(week, ingredient_id) DO UPDATE
      SET checked = excluded.checked, updated_at = excluded.updated_at
  `).run(week, ingredientId, checked ? 1 : 0);
  revalidatePath('/shopping');
}

export async function removeItem(week: string, ingredientId: number) { /* set removed=1 */ }
export async function resetChecks(week: string) { /* UPDATE checked=0 WHERE week=? */ }
export async function addExtra(week: string, name: string, qty?: number, unit?: string, cat?: string) { /* ... */ }
export async function toggleExtra(extraId: number, checked: boolean) { /* ... */ }
```

**Optimistic UI:** TanStack `useMutation` con `onMutate` que actualiza la cache local antes de que vuelva la respuesta. UX igual de rápida que `localStorage` pero sincronizada.

### 6.7 Service worker — offline shopping

```js
// public/sw.js — registrarlo desde layout.tsx con un useEffect cliente
// Estrategia:
// - /shopping y assets estáticos: cache-first (network revalida en background)
// - /api/shopping/*: network-first con fallback a cache
// - Mutations offline: cola en IndexedDB, replay al recuperar conexión (background sync API)
```

Librería sugerida: **`workbox-window`** + `workbox-build` en build step, o hand-rolled si Eric prefiere cero dependencias extra. Registrar SW solo en producción (`process.env.NODE_ENV === 'production'`) para no interferir con HMR.

---

## 7. PWA

**`public/manifest.webmanifest`:**
```json
{
  "name": "MealPlan",
  "short_name": "MealPlan",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f0f0f",
  "theme_color": "#0f0f0f",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**En `src/app/layout.tsx`:**
```tsx
export const metadata: Metadata = {
  title: 'MealPlan',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MealPlan',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f0f0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};
```

**Iconos:** generar 192×192 y 512×512 PNG. Eric puede usar emoji 🍽️ sobre fondo dark como placeholder.

---

## 8. Diseño visual

- **Dark mode default.** Fondo `#0f0f0f`, surface `#1a1a1a`, surface-2 `#262626`.
- Acento: Tailwind `blue-500` (#3b82f6). Favorito: `yellow-400` (#facc15).
- Texto principal `#f5f5f5`, secundario `#a3a3a3`.
- Día actual: borde `blue-500`.
- Bordes redondeados generosos (`rounded-2xl` cards, `rounded-full` botones acción).
- System font stack.
- Emojis a `text-5xl` en cards.
- Animaciones sutiles: `transition-all duration-200`.
- **Safe areas iOS:** `env(safe-area-inset-bottom)` en bottom nav.
- **`100dvh` en lugar de `100vh`** para evitar bug barra Safari.

---

## 9. Docker / Unraid setup

### 9.1 Dockerfile

```dockerfile
# Build stage
FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage — usa el output 'standalone' de Next 15 (~10× más pequeño)
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/seeds ./seeds
# better-sqlite3 binding nativo: standalone lo incluye porque está en serverExternalPackages
EXPOSE 3000
CMD ["node", "server.js"]
```

**Notas:**
- `bookworm-slim` en lugar de `alpine` porque `better-sqlite3` requiere compilación nativa y suele dar problemas con Alpine + musl.
- `output: 'standalone'` en `next.config.ts` (ver §2.1) genera `.next/standalone/server.js` con solo las deps necesarias.

### 9.2 docker-compose.yml

```yaml
version: '3.8'
services:
  mealplan:
    build: .
    container_name: mealplan
    restart: unless-stopped
    ports:
      - "3001:3000"
    volumes:
      - /mnt/user/appdata/mealplan/data:/app/data
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/data/mealplan.db
```

### 9.3 Unraid

1. Crear directorio en Unraid: `/mnt/user/appdata/mealplan/data`
2. Build de la imagen en Unraid (Docker compose plugin) o pull desde GHCR si Eric monta CI
3. NPM (Nginx Proxy Manager): nuevo Proxy Host
   - Domain: `mealplan.elehmann.dev`
   - Forward to: `mealplan:3000` (en red compartida con NPM)
4. Cloudflare DNS: CNAME `mealplan` → tunnel hostname, **proxied (naranja)**
5. Cloudflare Zero Trust: Access según sección 2

### 9.4 Migrations al boot

`src/lib/db.ts` ejecuta todos los `.sql` de `migrations/` por orden alfabético al inicializar, idempotente vía tabla `_migrations` (id, filename, applied_at). Seeds en `seeds/ingredients.sql` se cargan solo si la tabla `ingredients` está vacía.

**Lista sugerida de seeds (~50 ingredientes):** tomate, cebolla, ajo, aceite oliva, sal, pimienta negra, pollo, pechuga de pollo, ternera picada, atún en lata, huevos, leche, mantequilla, queso rallado, mozzarella, arroz, pasta, lentejas, garbanzos, alubias, harina, azúcar, levadura, pan, patatas, zanahoria, calabacín, pimiento rojo, pimiento verde, brócoli, espinacas, lechuga, limón, manzana, plátano, vino blanco, caldo de pollo, salsa de tomate, mostaza, vinagre, miel, comino, pimentón, orégano, albahaca, perejil, jengibre, salmón, gambas.

---

## 10. Roadmap incremental

Construir y commit en este orden:

1. **Boilerplate Next.js** + Tailwind + estructura de carpetas + dark theme base + `next.config.ts` con `output: 'standalone'` y `serverExternalPackages: ['better-sqlite3']`
2. **DB + migrations + seeds** + helpers `lib/db.ts` (singleton), `lib/week.ts` (con `date-fns` + tests unitarios), `lib/scale.ts` (con tests unitarios)
3. **Modelos** (`recipe`, `ingredient`, `plan`) + tipos TS
4. **CRUD recetas** (sin ingredientes todavía): lista, detalle, form crear/editar + **toggle favorito** + **duplicar receta**
5. **Repeater de ingredientes** en form de receta + autocomplete endpoint
6. **Vista semanal vertical** (estática, sin datos reales) + bottom nav
7. **RecipePicker** (bottom sheet) + flujo añadir al plan + **filtro favoritos**
8. **ContextMenu** (bottom sheet) con todas las acciones excepto drag
9. **Drag-and-drop** con @dnd-kit + lógica move/swap — **probar en mobile real con la semana llena antes de seguir**
10. **Vista de receta** con `ServingsStepper` y reescalado client-side
11. **Lista de compra** — `lib/shopping.ts` (suma) + UI + **server actions sobre `shopping_state`** + **items ad-hoc** (`shopping_extras`) + tests unitarios de `generateShoppingList`
12. **WeekActionsMenu** — duplicar semana anterior + limpiar semana
13. **PWA** (manifest, iconos, meta tags) + **service worker con cache-first de `/shopping` y cola IndexedDB para mutations offline**
14. **Dockerfile + docker-compose** (standalone) + smoke test local
15. **Deploy Unraid** + NPM + Cloudflare Access

---

## 11. Notas sobre Eric (working style)

- Eric es **vibecoder**: dale comandos terminales **exactos y secuenciales**, con fixes inline para errores probables (ej: si Alpine + better-sqlite3 falla, switch a bookworm-slim — ya está previsto).
- Comentarios solo donde aporten (lógica de escalado, query de shopping, intercambio de slots). No comentar lo obvio.
- Decisiones UX menores no resueltas → proponer solución y seguir, no bloquear.
- Prioridad: **app funcionando end-to-end** antes que pulido visual. v1 fea pero completa > v2 bonita a medias.
- Tras cada fase del roadmap: commit + push directo a main (repo personal).
- Probar siempre en Chrome DevTools con device emulation (iPhone 13 Pro o Pixel 7) — no asumir que funciona en mobile sin verificar.
- iOS Safari es el target más estricto: testear PWA real instalada cuando llegue al deploy.
