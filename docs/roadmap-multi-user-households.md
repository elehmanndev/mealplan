# Roadmap idea — multi-user + households

**Status:** idea, not committed. Capturing for later evaluation.
**Drafted:** 2026-05-10

## Why consider this

Friends keep asking to use mealplan. Today the app runs on a private Unraid box (`***REDACTED-LAN-IP***:3004`), single-tenant, no auth, no per-user data. Sharing means giving them an account on the home network or letting them write into the same shared DB — neither flies.

Going multi-user with **households** as the sharing unit is the natural next step. A household is the workspace (a family/flatmates), users are identities, and a user can belong to one or many households.

This is **not** a public product effort. Goal: friends-scale (~5–20 households, ~10–50 users), self-hosted by Eric, free or near-free to run.

## Data model

Three concepts:

- **User** — identity (email + auth method).
- **Household** — the workspace; owns recipes, plans, shopping lists.
- **Membership** — `(user_id, household_id, role)` join table; role is `owner` or `member`. Many-to-many from day 1 even if v1 UI only surfaces one.

Schema deltas:

- All current row-owning tables (`recipes`, `meal_plan`, `shopping_list_items`, …) gain `household_id` (NOT `user_id` — meal plans are shared).
- Optional `created_by_user_id` on user-mutated rows for audit / "who added this" UX. Not used for scoping.
- Indices on `household_id` for every scoped table.
- `user`, `household`, `membership`, plus `invite` (signed token + expiry).

## Auth

[Auth.js](https://authjs.dev) with **magic-link email** as the primary method. Reasoning:

- No passwords to manage / leak.
- Works on iOS/Android browsers without OAuth popup friction.
- Pairs with [Resend](https://resend.com) free tier (3k emails/mo).
- Google OAuth can be added later without other code changes.

Session: JWT cookie, `httpOnly` + `Secure` + `SameSite=Lax`. No need for a session table.

## Invites

Signed JWT in URL: `/join/<token>`. Token payload: `{ household_id, inviter_user_id, exp }`. Flow:

1. Owner clicks "Invite" → server signs a token → owner gets a shareable link.
2. Recipient opens link → if logged out, sent through magic-link sign-in first → then `/join/<token>` validates and creates the membership row.
3. Tokens are single-use and expire (7 days).

Link-shareable via WhatsApp, no email-match dance required.

## Chat scoping

Per-IP daily cap ([src/lib/chat-rate-limit.ts](../src/lib/chat-rate-limit.ts)) moves to **per-user**. Starting cap: 50 messages/user/day (vs 200/IP today). Tunable.

Chat costs are the variable cost at friends-scale. Two paths:

- Stay on Gemini, eat the bill (~$0.10–$3/mo at this scale). Simplest.
- Implement the OpenRouter free-tier swap from [docs/roadmap-chat-provider-swap.md](./roadmap-chat-provider-swap.md). Becomes load-bearing if usage grows.

A third option — "BYO API key per household" — is open-ended and probably over-engineered for friends.

## Hosting move

Unavoidable. The Unraid box stops being authoritative.

- **Backend:** Vercel hobby (free) — Next.js native fit.
- **DB:** Turso (libsql / SQLite-flavored, generous free tier, keeps current schema mental model). Neon (Postgres) is the alternative if we ever need real concurrent writes.
- **Email:** Resend free tier (3k/mo covers everything).
- **Domain:** something cheap (`mealplan.eric.dev` or similar).
- **Cost projection at friends-scale:** $0–10/mo, dominated by chat.

Migration: dump current SQLite → seed Turso → assign all existing rows to a "Eric's household" with Eric as owner. Existing data preserved.

## Decisions needed before coding

1. **Recipe library scope** — per-household only, or global read-pool?
   - Per-household: simpler, isolated, friends start empty.
   - Global pool of "public" recipes that any household can copy/fork: nicer UX, more code (visibility flag, fork action, attribution).
   - **Default:** per-household for v1. Add a "Featured" copy-from-Eric flow in v2 if useful.

2. **One household per user (v1) vs many from day 1?**
   - Many from day 1 is +~20% UI effort (household switcher in nav) but avoids a future schema migration.
   - **Default:** many from day 1, but v1 UI only shows the user's *active* household; switcher is added when there's a second household to switch to.

3. **What does "leaving a household" mean?**
   - Member loses access. Their `created_by_user_id` annotations remain (recipes don't disappear).
   - Owner can't leave — must transfer ownership or delete the household first.
   - **Default:** boring answer above.

4. **Anonymous / pre-auth users?**
   - The PWA currently works with no login at all. Should the marketing page allow "try it without an account" with localStorage-only data?
   - **Default:** no. Multi-user app needs accounts. Friction is the price of sharing.

5. **Account deletion / GDPR?**
   - Self-serve "delete my account" endpoint that removes the user + memberships + their `created_by_user_id` references (NULL them, don't cascade-delete recipes).
   - Required if Eric's friends in EU use it. **Default:** ship in v1.

## Phasing

### v0 — today

PWA on Unraid for Eric's household. ✓

### v1 — multi-user MVP (1–2 weekends)

- Auth.js + magic links + Resend.
- `user`, `household`, `membership`, `invite` tables.
- All existing tables gain `household_id`; every query scoped by current household.
- Migration of Eric's current SQLite into Turso under "Eric's household".
- Vercel + Turso hosting; Unraid retired (or kept as backup).
- Invite-by-link flow.
- Per-user chat cap.
- "Settings → Account" with sign-out + delete-account.
- "Settings → Household" with member list + invite button + leave button.

This is the meaningful milestone. Beyond v1, it's a multi-user app.

### v2 — multi-household + polish (~1 weekend)

- Household switcher in the top-right of the BottomNav header.
- Per-household onboarding ("create a household" flow, currently auto-on-signup).
- "Copy recipe from another household" (basic forking).

### v3 — only if it takes off

- App Store / Play Store wrappers via Capacitor.
- Real billing if costs ever justify it.
- Featured / public recipe pool.

## Open / cross-cutting questions

- **Multi-language ([roadmap-multilang.md](./roadmap-multilang.md))** likely lands *before* multi-user — Eric's friends include non-Spanish speakers. Doing both at once is fine if multi-lang is just chat + UI strings.
- **Provider swap ([roadmap-chat-provider-swap.md](./roadmap-chat-provider-swap.md))** is independent but becomes more attractive once N households are paying chat costs. Decide based on actual usage post-v1.
- **Data export** — should every member be able to export their household's recipes as JSON? Cheap to add to v1.

## Rough sequencing if all three roadmaps land

1. Multi-language v1 (just chat + Ajustes picker; no DB change). 1 weekend.
2. Multi-user v1 (this doc). 1–2 weekends.
3. Provider swap (if chat costs become real). 2–3 days.

No DB migration depends on a feature later in the list — they're independent.
