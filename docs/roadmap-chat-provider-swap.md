# Roadmap idea — Swap Gemini for Qwen3-Next via OpenRouter

**Status:** idea, not committed. Capturing for later evaluation.
**Drafted:** 2026-05-10

## Why consider this

Today's `/chat` runs on `gemini-2.5-flash` via the paid Google API ([src/app/api/chat/route.ts](../src/app/api/chat/route.ts)). It works well and is cheap (~$0.0003/turn, €2/mo cap → ~6,500 turns/mo), but:

- We're locked into a paid billing relationship for what's a hobby/single-family app.
- Free-tier alternatives have caught up. Qwen3-Next-80B-A3B-Instruct (released 2026, available on OpenRouter as `qwen/qwen3-next-80b-a3b-instruct:free`) is an MoE model with only 3.9B active params per token — comparable latency to Flash, native tool calling, designed for stable instruction-following without `<think>` traces. Reportedly beats Gemini 2.5 Flash-Thinking on multiple benchmarks.
- Switching breaks the dependency on a single vendor and removes the recurring billing relationship.

## Why it's feasible

The current route is already mostly provider-agnostic. The validation-driven architecture (`ChatRecipeSchema`, `runSaveRecipeTool`, `MODEL_FILLED_FIELDS`, deterministic Spanish question builder) operates on parsed tool args, not Gemini-specific types. Roughly 70% of [route.ts](../src/app/api/chat/route.ts) is unchanged by a swap.

The retry-with-feedback architecture (route tells the model exactly which fields are missing/invalid in `next_action`) absorbs the quality gap if Qwen's tool-call adherence is weaker than Flash's.

## What differs between Gemini SDK and OpenRouter (OpenAI-compatible)

| Concern | Gemini today | OpenRouter shape |
|---|---|---|
| Endpoint | `@google/genai` SDK | `POST https://openrouter.ai/api/v1/chat/completions` |
| Auth | `GEMINI_API_KEY` | `Authorization: Bearer <OPENROUTER_API_KEY>` (+ optional `HTTP-Referer`, `X-Title`) |
| Conversation | `Content[]` with `role: 'user'\|'model'`, `parts: [{text}\|{functionCall}\|{functionResponse}]` | `messages[]` with `role: 'system'\|'user'\|'assistant'\|'tool'`, plus `tool_calls` on assistant turns and `tool_call_id` on tool turns |
| System prompt | `systemInstruction` config | First message `{role:'system', content:...}` |
| Tool declaration | `FunctionDeclaration { parametersJsonSchema }` | `tools: [{type:'function', function:{name, description, parameters}}]` (same JSON Schema works) |
| Force tool call | `mode: ANY, allowedFunctionNames` | `tool_choice: {type:'function', function:{name:'save_recipe'}}` |
| Free tool call | `mode: AUTO` | `tool_choice: 'auto'` |
| Streaming | SDK iterator yields `{text, functionCalls}` | SSE `data: {choices:[{delta:{content?, tool_calls?}}]}` — **tool args arrive as string fragments, must accumulate per `tool_calls[].index` then JSON.parse** |
| Fallback | One model | `models: ['primary', 'fallback1']` — OpenRouter routes automatically on failure |
| Errors | SDK exceptions | HTTP status + JSON; 429 for rate limits |

## Implementation plan

### Step 1 — Decisions to make first

1. **Library**: `openai` npm SDK (`baseURL` override supported, handles tool-call delta accumulation correctly) vs native `fetch` (zero deps, ~80 lines of SSE parsing). **Recommend `openai` SDK.**
2. **Hard swap or provider-flag transition?** Keep `CHAT_PROVIDER=openrouter|gemini` env flag for ~1 week; drop Gemini once Qwen proves out. Cheap insurance.
3. **Rate-limit strategy**: see Risks below — likely deposit $10 on OpenRouter once.

### Step 2 — Refactor route to provider-agnostic shape

In [src/app/api/chat/route.ts](../src/app/api/chat/route.ts), keep unchanged:
- `ChatRecipeSchema`, `recipeJsonSchema`, `runSaveRecipeTool`, `extractIngredientNames`, `formatPath`
- `MODEL_FILLED_FIELDS`, `buildUserQuestion`, `buildNextAction`, `describeMissingField`
- `SYSTEM_PROMPT`
- The whole post-tool-call orchestration (round loop, deterministic-question short-circuit, draft emission)

Define a thin provider interface:
```ts
interface ChatProvider {
  streamRound(opts: {
    messages: ProviderMessage[];
    systemPrompt: string;
    toolSchema: object;
    forceTool: boolean;
    timeoutMs: number;
  }): AsyncIterable<{ textDelta?: string; toolCall?: { name: string; args: unknown } }>;
}
```

The provider yields a normalized stream; the route's orchestration logic stays identical.

### Step 3 — Implement OpenRouter provider

New file: `src/lib/chat/openrouter-provider.ts`
- `openai` SDK with `baseURL: 'https://openrouter.ai/api/v1'`, `apiKey: process.env.OPENROUTER_API_KEY`.
- `models: ['qwen/qwen3-next-80b-a3b-instruct:free', 'google/gemma-4-31b-it:free']` — automatic fallback to Gemma if Qwen rate-limits.
- Sends `tools: [saveRecipeTool]`, `tool_choice` per round.
- On streaming chunks: accumulate `tool_calls[].function.arguments` per `index` until stream ends, then `JSON.parse` and yield as a single `toolCall`. Yield `textDelta` for `delta.content` immediately.
- Headers: `HTTP-Referer: https://mealplan.local`, `X-Title: MealPlan` (OpenRouter best practice for attribution and friendlier rate-limit treatment).

### Step 4 — Wire provider selection

- Read `process.env.CHAT_PROVIDER` (default `'openrouter'`); fall back to `'gemini'` if `OPENROUTER_API_KEY` missing.
- Update missing-key error message + the early `if (!apiKey)` guard.
- Replace `ai.models.generateContentStream()` with `provider.streamRound()`.

### Step 5 — Conversation history conversion

Refactor `messages` from Gemini's `Content[]` to a neutral shape (`{role, content, toolCall?, toolResult?}`) and let each provider serialize. The round loop's `contents.push({role:'model', parts:[...]})` and `contents.push({role:'user', parts: responseParts})` becomes `messages.push({role:'assistant', toolCalls: [...]})` and `messages.push({role:'tool', toolCallId, content: result})` for OpenRouter.

### Step 6 — Env, deploy, docs

- `.env.local`: `OPENROUTER_API_KEY=sk-or-v1-...`
- Unraid container: add the env var.
- `package.json`: add `openai`, keep `@google/genai` until step 8.
- Update [docs/chat-assistant.md](chat-assistant.md): provider section, new env var, rate-limit reality check, fallback chain.

### Step 7 — Verify in dev

Run `next dev`, exercise these scenarios in `/chat`:
1. **Happy path** — "lentejas con chorizo para 4". Expect: streaming text → recipe_draft → confirmation.
2. **Missing-field path** — "fabada". Expect: ingredient suggestions in draft, deterministic Spanish question for `servings`/`prep_time_min`/per-ingredient quantities. Most likely to surface protocol bugs.
3. **Already-exists path** — repeat a recipe. Expect: `recipe_skipped` event.
4. **Rate-limit path** — point at an exhausted key, expect "saturado por hoy" toast.
5. **Multi-turn correction** — "cámbiale el supermercado a Mercadona" after a draft. Expect: model edits one field, keeps the rest.

### Step 8 — Cleanup (a week later, if green)

- Delete Gemini provider, `@google/genai` dep, `GEMINI_API_KEY` references.
- Delete `CHAT_PROVIDER` flag.

## Risks

### Tool-call schema adherence
Qwen's tool calling is strong but not Gemini-tier. The existing `MODEL_FILLED_FIELDS` + retry-with-feedback architecture absorbs this — that's why this swap is feasible. Worst case: more round-1 retries than today.

### Streaming buffering on free tier
Some OpenRouter free providers buffer tokens. If TTFT feels worse, pin a specific provider via `provider: { order: [...] }` or set `transforms: ['middle-out']` off.

### Tool-args JSON parse failure
Incremental string fragments occasionally produce malformed JSON if the stream truncates. Wrap `JSON.parse` and feed the failure into the existing `invalid_fields` path so the validator tells the model to retry.

### Rate limits — the most operationally important risk

OpenRouter free tier (changed in 2026):

| Account state | Free requests/day | Per-minute |
|---|---|---|
| **No credits ever purchased** | **50/day** | 20/min |
| **At least $10 credits purchased once** | **1,000/day** | 20/min |
| Failed requests | Still count against daily | — |

The cap attaches to the **single OpenRouter API key** stored as a server env var → it's **shared across all users of `/chat`**. Today's per-IP 200/day cap in [src/lib/chat-rate-limit.ts](../src/lib/chat-rate-limit.ts) is just a runaway-loop guard; with OpenRouter, the OpenRouter-side cap becomes the actual ceiling.

Each `/chat` turn costs **1–2 OpenRouter requests**:
- Happy path → 1 request
- Validation needs a model-domain retry → 2 requests
- Deterministic Spanish question short-circuit → 0 extra

Real-world capacity:

| Setup | Daily turns capacity (all users combined) |
|---|---|
| Free, no credits | ~25–50 turns/day |
| Free, $10 deposit | ~500–1,000 turns/day |
| **Current Gemini @ €2/mo cap** | **~215 turns/day average, elastic** |

**Mitigation: drop $10 once.** Stays in account balance, doesn't decrement when using `:free` models. Effectively a one-time deposit to unlock the better free tier. For a single-family app this is plenty.

### Backout
The provider flag (Step 1, decision 2) means flipping back to Gemini is one env-var change. Worst case ~30 minutes to revert.

## Open questions before starting

1. Library: `openai` SDK or native fetch?
2. Hard swap or provider-flag transition?
3. Drop $10 on OpenRouter day one, or live with the 50/day cap during evaluation?

## Net effort estimate

~150 lines of code change concentrated in:
- [src/app/api/chat/route.ts](../src/app/api/chat/route.ts) (refactor to provider interface)
- `src/lib/chat/openrouter-provider.ts` (new)
- `src/lib/chat/gemini-provider.ts` (new — extracted from route)

Frontend ([src/components/chat/ChatPanel.tsx](../src/components/chat/ChatPanel.tsx)) needs zero changes — it consumes our own SSE event names.

## References

- [Qwen3 Next 80B A3B Instruct (free) — OpenRouter](https://openrouter.ai/qwen/qwen3-next-80b-a3b-instruct:free)
- [OpenRouter API Rate Limits](https://openrouter.ai/docs/api/reference/limits)
- [Current chat assistant docs](chat-assistant.md)
