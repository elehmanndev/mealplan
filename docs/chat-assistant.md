# Chat assistant (`/chat`)

Gemini-powered conversational interface for adding recipes to the recipe book in Spanish, free-form natural language. Validation is server-side and drives the dialogue: the model proposes, the server tells it what's still missing, the model relays the question to the user.

## At a glance

| Piece | Where | Notes |
|---|---|---|
| Page | [`src/app/chat/page.tsx`](../src/app/chat/page.tsx) | Server component shell, hosts `<ChatPanel>` and the bottom nav |
| UI | [`src/components/chat/ChatPanel.tsx`](../src/components/chat/ChatPanel.tsx) | SSE consumer, markdown via `react-markdown` + `remark-gfm`, mic-hint button |
| API | [`src/app/api/chat/route.ts`](../src/app/api/chat/route.ts) | SSE streaming, Gemini 2.5 Flash-Lite, `save_recipe` tool |
| Schema (strict) | `ChatRecipeSchema` inside the route | Source of truth for "is this complete?" |
| Schema (loose) | `recipeJsonSchema` in the route, sent to Gemini | No `required` — model is encouraged to call with whatever it has |
| Rate limit | [`src/lib/chat-rate-limit.ts`](../src/lib/chat-rate-limit.ts), migration `008_chat_usage.sql` | Per-IP daily cap (200), SQLite |
| Shared insert | [`src/lib/recipe-import.ts`](../src/lib/recipe-import.ts) | One code path used by both `/api/import` (paste-JSON) and `/api/chat` (LLM tool) |
| Pantry/al-gusto | `'al_gusto'` in `UNITS`, `formatAmount()` in [`src/lib/scale.ts`](../src/lib/scale.ts) | Pantry items skip quantity prompts, render as "al gusto", excluded from shopping list |

## Setup

1. Create a Gemini API key in **AI Studio** → pick the GCP project (we use `mealplan-495807` under the `***REDACTED-CF-TEAM***-org` org). Enable the Generative Language API on the project.
2. Add to `.env.local` for dev:
   ```
   GEMINI_API_KEY=AIza...
   ```
3. **Unraid prod**: add the same env var to the `mealplan` container (Docker UI → Edit → Environment Variables → Apply, container restarts).
4. Optional: in AI Studio → Spend, set a monthly cap (e.g. €2). Once exceeded, Gemini hard-stops and our route surfaces a "saturado por hoy" toast.

The route returns `500 GEMINI_API_KEY no configurada` if the env var is missing.

## Architecture

### Request flow

```
User types in textarea
  └── POST /api/chat  { messages: [{role,content}] }
        ├── per-IP rate-limit (chat_usage SQLite table)
        └── streaming SSE response
              ├── round 0 → Gemini, mode=ANY → forces save_recipe tool call
              ├── route validates args against strict ChatRecipeSchema
              │     ├── ok → importRecipes() → DB insert → emit `recipe_created`
              │     ├── ok, already exists → emit `recipe_skipped`
              │     └── invalid/missing →
              │           ├── if user-domain fields missing → emit `text` with
              │           │   pre-formatted Spanish bullets (deterministic, no
              │           │   round 1 needed) and break
              │           └── if model-domain only → loop to round 1 (mode=AUTO)
              └── emit `done` { remaining, cap }
```

### Field ownership

The system prompt and validator distinguish three groups:

**Model fills autonomously (NEVER asks the user):**
- `name` — normalizes input (e.g. `"fabada"` → `"Fabada Asturiana"`)
- `emoji` — picks one based on the dish (🍝/🥗/🍲/🥘/🐟/🍗…)
- `category` — one of `RECIPE_CATEGORIES` based on the dish type
- `description` — generates a 1–2 sentence blurb

When the user gives only a recipe name, the model is also encouraged to **suggest ingredient names** (no quantities or supermarkets), letting the user revise + supply the user-domain data.

**User must provide:**
- `servings`
- `prep_time_min`
- For each non-pantry ingredient: `quantity`, `unit`, `supermarket`

**Pantry items (`is_pantry: true`):**
- Aceite, sal, pimienta, especias, vinagre, etc. — model marks these
- `quantity`/`unit`/`supermarket` are skipped; defaults applied (`unit='al_gusto'`, `quantity=1`, `supermarket=null`)
- Set `is_pantry=1` on the ingredient row → excluded from shopping list aggregation in `src/lib/shopping.ts`

`MODEL_FILLED_FIELDS` in the route partitions missing-field paths into "model retries" vs "ask user" so the deterministic question targets only user-domain gaps.

### Why a deterministic Spanish question instead of letting the model verbalize?

Flash-Lite reliably picks up the structured `missing_fields` and calls the tool again, but **frequently goes silent in round 1** (no text streamed after a tool response). To avoid burning Gemini quota on a round that may not produce text, the route emits the question itself as `text` events when user-domain fields are missing, and breaks out of the loop. This also halves the typical Gemini calls per turn and gives consistent wording.

### Why force `mode=ANY` in round 0?

Without it, the model often refuses to call the tool until it's "sure" (over-asking). With ANY, it always emits a draft on the first round. Combined with the loose function declaration (no `required` fields) and a "PROHIBIDO INVENTAR" rule in the prompt, the model produces sparse-but-honest drafts that the validator can react to.

In subsequent rounds we use `mode=AUTO` so the model can also produce text replies (confirmations, follow-up questions).

### SSE events

| Event | Payload | When |
|---|---|---|
| `text` | `{ delta: string }` | Streaming text chunk from Gemini OR a deterministic question from the route |
| `recipe_created` | `{ id, name }` | Tool call succeeded and a row was inserted |
| `recipe_skipped` | `{ name }` | Tool call succeeded but the recipe already existed (case-insensitive name match) |
| `tool_error` | `{ error }` | DB insert failed |
| `done` | `{ remaining, cap }` | End of stream |
| `error` | `{ message, rateLimited? }` | Transport-level error (Gemini quota, server error) |

The client parses the SSE stream manually (no `EventSource` because we use `POST`).

## Rate limits & cost

- **Per-IP soft cap**: 200 turns/day in [`src/lib/chat-rate-limit.ts`](../src/lib/chat-rate-limit.ts). Exists to prevent runaway loops, not as a money control.
- **Hard ceiling**: the AI Studio monthly spend cap (we set €2). Once hit, Gemini returns 429 and our route's catch surfaces the same "saturado" message.
- **Free vs paid tier**: with billing attached, the project is on paid tier — every request bills (no free RPD bucket). At Flash-Lite paid pricing ($0.10 / $0.40 per 1M input/output tokens), a realistic recipe-creation turn costs **~$0.0003**, so €2 ≈ ~6,500 turns/month.

If usage outgrows €2 sustainably, options:
1. Raise the AI Studio cap.
2. Spin up a second project (`mealplan-2`) with its own key + free tier; round-robin in the route. Limits are per-project.
3. Enable Gemini prompt caching for the static system prompt + tool declaration (~30% savings, only worth it once you're spending real money).

## Adding new tools

Today's only tool is `save_recipe`. To add another (e.g. `assign_to_plan`, `search_recipes`):

1. Add a `FunctionDeclaration` next to `saveRecipeDeclaration` in the route.
2. Add a `runXTool(args)` handler returning `ToolResult`.
3. Branch in the `accumulatedCalls` loop on `call.name`.
4. If the tool is destructive or produces structured output the user should see, emit a custom SSE event and handle it in `ChatPanel.handleEvent`.

If you want round 0 to call multiple tools, drop the `allowedFunctionNames: ['save_recipe']` from the round-0 `toolConfig`.

## Voice input

The mic button next to Send doesn't call any speech API — it focuses the textarea and shows a **one-time toast** ("Toca el micrófono de tu teclado para dictar 🎤"). On mobile this opens the keyboard, which has a native mic icon. Free, works offline-as-long-as-the-keyboard-does, no quota cost. Persisted in `localStorage['mealplan.micHintSeen']`.

If we ever want true server-side transcription (e.g. for desktop), Gemini accepts audio natively — could send a recorded blob to a separate `/api/chat/transcribe` route and inject the transcript as the user message. Not built.

## Known limitations

- **Flash-Lite over-asks** about implied units ("1 limón" → asks for unit). Tightening the prompt helps but doesn't fully eliminate it. Upgrading to Gemini 2.5 Flash (4× the per-day cost on free tier, ~3× on paid) would improve instruction-following at the cost of quota.
- **Auto-suggest reliability** — when the user gives only a name, Flash-Lite sometimes proposes incomplete ingredient entries (an entry at index 0 with no name). Same root cause as above.
- **No streaming UI for ingredient chips** — the recipe chip pops in only on the `recipe_created` event, not progressively.
- **Single tool per turn** — `accumulatedCalls.length` supports multiple, but the prompt instructs "una llamada por receta" so we get one in practice. Multiple recipes in one user message would still work.
