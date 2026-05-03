# MealPlan — Unraid deploy state

Last updated: 2026-05-02 by Claude.

## TL;DR

The container is **running on the Unraid LAN** at `http://192.168.1.45:3004`. You can open it on your phone right now (same WiFi) and use the app. What's left is purely the public-internet wiring: NPM proxy host + Cloudflare tunnel route + Cloudflare Access policy. Those three are dashboard-only — I don't have API tokens for either.

## Where things live on Unraid

| Thing | Location |
| --- | --- |
| Project source | `/mnt/user/appdata/mealplan/` (synced from this Windows repo via `git archive`) |
| SQLite DB + WAL files | `/mnt/user/appdata/mealplan/data/mealplan.db*` |
| Compose file | `/mnt/user/appdata/mealplan/docker-compose.yml` |
| Container name | `mealplan` |
| Image tag | `mealplan:latest` |
| Host port | `3004` (mapped to container `3000`) |
| LAN URL | `http://192.168.1.45:3004` |
| SSH alias | `unraid` (uses `~/.ssh/taskr_unraid`) |

## Source-code fixes I made during deploy

PROGRESS.md said the build worked — and it does, *locally*. But it broke in Docker for two reasons. Both fixes are committed to the working tree on Windows AND already on Unraid; if you rebuild locally those edits are now permanent.

### 1. `src/lib/db.ts` — lazy DB via Proxy

**Before:** `export const db = globalForDb.db ?? init();` — opened SQLite at module-load time.

**After:** `db` is a Proxy that calls `getDb()` on first member access.

**Why:** during `next build`, Next runs route modules in parallel workers to "collect page data". Each worker imported `@/lib/db`, which opened its own `Database` handle on the same WAL file → `SQLITE_BUSY` → "Failed to collect page data for /api/recipes". Lazy init means the file is only opened when an actual handler runs, which doesn't happen during build (see fix #2).

**Don't undo this.** If you ever refactor `db.ts`, keep init deferred to first method call.

### 2. Three API routes marked `force-dynamic`

Added `export const dynamic = 'force-dynamic';` to:

- `src/app/api/ingredients/search/route.ts`
- `src/app/api/recipes/route.ts`
- `src/app/api/shopping/text/route.ts`

These routes read URL params and hit the DB — they were never meant to be statically collected. Without this, Next still tries to evaluate them during build, which is what triggered the parallel-import collision in #1.

### 3. `docker-compose.yml` — port 3001 → 3004

`mcphub` already binds host port 3001 on this Unraid box (and 3000 = NPM, 3002 = taskr-server, 3003 = taskr-client). 3004 was the next free port.

## Unraid-specific quirks

### Docker Hub R2 blob endpoint times out

This Unraid can't reach `*.r2.cloudflarestorage.com` (Docker Hub's blob CDN, hosted on Cloudflare R2). DNS resolves, but TCP/443 hangs. Other Cloudflare endpoints fail too (104.16.x.x, 172.67.x.x), but `1.1.1.1` and most of the rest of the internet work. Could be a Pi-hole rule, an MTU issue with the cloudflared interface, or an upstream ISP route — didn't dig further.

**Workaround used:** pull base images from Google's mirror and retag.

```bash
ssh unraid 'docker pull mirror.gcr.io/library/node:20-bookworm-slim \
  && docker tag mirror.gcr.io/library/node:20-bookworm-slim node:20-bookworm-slim'
```

Then build with `docker compose build --pull=false` so it uses the cached tag instead of trying to re-pull from Docker Hub.

### Data dir ownership

Container runs as uid 1001 (`nextjs`). The bind-mounted `data/` dir was created as root, which gave a `SQLITE_CANTOPEN` on first start. Fix:

```bash
ssh unraid 'chown -R 1001:1001 /mnt/user/appdata/mealplan/data'
```

Already done. Only relevant if you ever blow the directory away and recreate it.

## Redeploy one-liner

After making changes locally and committing them:

```bash
git archive HEAD | ssh unraid 'tar -x -C /mnt/user/appdata/mealplan' \
  && ssh unraid 'cd /mnt/user/appdata/mealplan && docker compose build --pull=false && docker compose up -d'
```

That ships only tracked files (no `node_modules`, no `.next`, no `data/`), rebuilds the image without trying to re-pull from Docker Hub, and recreates the container.

If you have *uncommitted* changes you want to ship without committing first, use `git ls-files` instead:

```bash
tar -cf - $(git ls-files) | ssh unraid 'tar -x -C /mnt/user/appdata/mealplan'
```

## What's left — public internet wiring

### Step 1 — NPM proxy host

Open NPM admin at `http://192.168.1.45:81`.

Hosts → Proxy Hosts → **Add Proxy Host**:

- **Domain Names:** `mealplan.elehmann.dev`
- **Scheme:** `http`
- **Forward Hostname / IP:** `192.168.1.45`
- **Forward Port:** `3004`
- ✅ **Block Common Exploits**
- ✅ **Websockets Support**
- **SSL tab:** None (Cloudflare terminates TLS at the edge for proxied hostnames)

### Step 2 — Cloudflare Zero Trust → Networks → Tunnels

Open the tunnel matching this token prefix on the Unraid container: `eyJhIjoiNTFiZDg3MDlmNDhmYzE5OWVkZWYxOTYzMTE4YTFjZDM…`.

Public Hostnames tab → **Add a public hostname**:

- **Subdomain:** `mealplan`
- **Domain:** `elehmann.dev`
- **Service → Type:** `HTTP`
- **Service → URL:** mirror what your other proxied apps use. The two common patterns are:
  - `192.168.1.45:8080` (NPM's HTTP port on this box, since the route in step 1 lives in NPM)
  - or whatever LAN target your existing public hostnames in this tunnel point at

This auto-creates the CNAME `mealplan` → `<tunnel-id>.cfargotunnel.com`, orange-clouded.

### Step 3 — Cloudflare Zero Trust → Access → Applications

**Add an Application → Self-hosted**:

- **Application name:** `MealPlan`
- **Subdomain / Domain:** `mealplan` / `elehmann.dev`
- **Session duration:** 1 month
- **Identity providers:** Google + One-Time PIN
- **Policy:** Allow → Include → Emails → your email + partner's

App will read `cf-access-authenticated-user-email` per `src/lib/auth.ts`.

## Operational commands

```bash
# logs
ssh unraid 'docker logs -f mealplan'

# restart
ssh unraid 'docker restart mealplan'

# stop / start
ssh unraid 'docker stop mealplan'
ssh unraid 'docker start mealplan'

# get into the container
ssh unraid 'docker exec -it mealplan sh'

# inspect DB from host
ssh unraid 'sqlite3 /mnt/user/appdata/mealplan/data/mealplan.db ".tables"'

# wipe DB and start fresh (DESTRUCTIVE)
ssh unraid 'docker stop mealplan \
  && rm /mnt/user/appdata/mealplan/data/mealplan.db* \
  && docker start mealplan'

# tear down completely
ssh unraid 'cd /mnt/user/appdata/mealplan && docker compose down'
```

## Smoke test (already passed)

All routes returned 200 on first boot:

```
200 /
200 /recipes
200 /shopping
200 /api/recipes
200 /api/shopping/text
200 /manifest.webmanifest
200 /sw.js
```

`GET /api/ingredients/search?q=tom` returned `Tomate` and `Salsa de tomate`, confirming migrations + seeds applied cleanly.

## Pending (not blockers)

- **PWA icons** — drop the four PNGs in `/public` per [public/README-icons.txt](public/README-icons.txt). Until then the install banner won't show.
- **Mobile real-device drag-and-drop** — never tested. Do once you can hit it via Cloudflare from outside.
- **Commit the deploy fixes locally** — three source edits + one compose edit aren't committed yet on the Windows side. Suggested commit:

  ```
  Deploy fixes: lazy DB Proxy, force-dynamic API routes, port 3004

  - src/lib/db.ts: wrap db in a Proxy so init() defers to first access.
    Parallel route module imports during `next build` were causing
    SQLITE_BUSY when each worker opened its own handle on the WAL file.
  - src/app/api/{ingredients/search,recipes,shopping/text}/route.ts:
    export const dynamic = 'force-dynamic'. These hit URL params + DB
    and should never be statically collected.
  - docker-compose.yml: host port 3001 -> 3004 (mcphub owns 3001 on
    this Unraid).
  ```
