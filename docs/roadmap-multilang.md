# Roadmap idea — Multi-language UI + chat

**Status:** idea, not committed. Capturing for later evaluation.
**Drafted:** 2026-05-10

## Goal

The app is currently Castellano-only. Add a language picker in **Ajustes** and translate the UI + chat assistant. Initial set:

- Spanish (es) — current default
- English (en)
- Catalan (ca)
- German (de)
- Italian (it)
- Portuguese (pt)

## Behavioral spec

### UI

- Persisted preference in `localStorage` (`mealplan.lang`) and surfaced via a new `LanguageContext` provider so server components can also receive it via cookie.
- All static strings move to a flat dictionary per locale (`src/lib/i18n/{es,en,ca,de,it,pt}.ts`). Use a tiny `t(key)` helper rather than pulling in `next-intl` or `react-i18next` — the surface area is small (~150 strings).
- Right-to-left languages out of scope.

### Chat assistant

- The model already runs free-form Spanish; switching to other languages costs nothing on the API side.
- The system prompt instructs the model to **detect the user's language from their first message and respond in the same language** — overriding the `lang` setting if the user explicitly switches mid-conversation. The setting is just the *default* for new chats.
- **Tone matching:** the model should adapt to the user's register. If the user writes salty/casual, reply salty/casual. If formal, reply formal. The "abuela sin sermón" personality stays — but in whatever language fits.
- Recipe data (ingredient names, supermarket labels) stays in the original language of the recipe — we don't translate `Bon Àrea` or `Mercadona`. Same for unit names (`g`, `ml`, `cucharada` etc.) — these are user-facing in the chat draft card and live in `src/types.ts`.

## Open questions

- Do we translate **existing recipe data** stored by the user (names, descriptions, notes)? Probably no — the user wrote them in their language. Just translate chrome.
- Shopping list categories (`SHOPPING_CATEGORIES`) — translate UI labels, but the canonical IDs stay English in the DB.
- Plan view day labels currently come from `Intl.DateTimeFormat` — these will localize for free once `lang` flows through.

## Rough plan

1. Build the `t()` helper + dictionaries for `es` (extract current strings) and `en`.
2. Add `Ajustes` selector that writes to `localStorage` and a cookie.
3. Sweep the codebase for hardcoded strings → replace with `t()`.
4. Update chat system prompt with the language-detection + tone-matching rules.
5. Add the remaining four locales (ca, de, it, pt).
6. QA each locale on plan/recipes/shopping/chat/settings.

No DB migrations needed.
