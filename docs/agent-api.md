# Agent read API

Read-only access to the meal plan for an AI agent that has no Google session (Eric's OpenBot "Majordomo").

```
GET /api/agent/plan?date=YYYY-MM-DD
Authorization: Bearer <MEALPLAN_AGENT_TOKEN>
```

Returns the Saturday → Friday week that contains `date` (default: today):

```json
{
  "week": "2026-10-31",
  "days": [{ "date": "2026-10-31", "comida": [{ "name": "…", "emoji": "…", "servings": 2 }], "cena": [] }],
  "shopping": "plain-text shopping list, same as /api/shopping/text"
}
```

- Disabled (401) unless `MEALPLAN_AGENT_TOKEN` is set. Generate one with `openssl rand -hex 32` and put it in the host `.env`.
- The token maps to one household: `MEALPLAN_AGENT_HOUSEHOLD_ID` (default `1`, Casa Lehmann).
- `/api/agent` is public in `src/middleware.ts`; the route checks the token itself with a constant-time compare.
- Cloudflare Access sits in front of the public hostname, so agents on the LAN call the container directly.
