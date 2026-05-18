# Backups — Litestream → Cloudflare R2

SQLite on a single Unraid box is fragile. Litestream watches the WAL of
`mealplan.db` and streams every change to R2 continuously, giving us
point-in-time recovery. Storage is ~$0 (free tier covers far more than
mealplan's tiny DB), and there are no egress fees on R2.

This runbook is the operational playbook — Claude can't execute the
Cloudflare clicks or `docker compose` for you, so the actual setup is
manual. It's about 20 minutes end-to-end.

---

## 1. Create an R2 bucket

1. Cloudflare dashboard → **R2** → **Create bucket**.
2. Name: `mealplan-backups`. Location: Eastern Europe (`EEUR`) or Western
   Europe (`WEUR`) — closest to Unraid.
3. After creation, click into the bucket → **Settings** → **CORS policy**
   — leave empty (no browser access needed).

## 2. Create an R2 API token

1. R2 → **Manage R2 API tokens** → **Create API token**.
2. Token name: `mealplan-litestream`.
3. Permission: **Object Read & Write**.
4. Specify bucket: `mealplan-backups`.
5. TTL: forever (or set a reminder to rotate yearly).
6. Click **Create API Token**.

Copy these into a scratch buffer — you'll paste them into the
`.env` in step 4. You won't see the secret key again:

- **Access Key ID** (~32 hex chars)
- **Secret Access Key** (~64 hex chars)
- **Endpoint** (looks like `https://<account-id>.r2.cloudflarestorage.com`)

## 3. Add the Litestream sidecar to docker-compose

Append the snippet below to `/mnt/user/appdata/mealplan/docker-compose.yml`
on Unraid. It runs Litestream in a tiny sidecar container that mounts the
same `data/` volume as the mealplan container and pushes WAL changes to R2.

```yaml
  litestream:
    image: litestream/litestream:0.3.13
    container_name: mealplan-litestream
    restart: unless-stopped
    depends_on:
      - mealplan
    volumes:
      - /mnt/user/appdata/mealplan/data:/data
      - /mnt/user/appdata/mealplan/litestream.yml:/etc/litestream.yml:ro
    environment:
      LITESTREAM_ACCESS_KEY_ID: ${LITESTREAM_ACCESS_KEY_ID}
      LITESTREAM_SECRET_ACCESS_KEY: ${LITESTREAM_SECRET_ACCESS_KEY}
    command: replicate
```

## 4. Create the Litestream config

Create `/mnt/user/appdata/mealplan/litestream.yml`:

```yaml
dbs:
  - path: /data/mealplan.db
    replicas:
      - type: s3
        endpoint: https://<account-id>.r2.cloudflarestorage.com
        bucket: mealplan-backups
        path: mealplan.db
        region: auto
        # Keep ~30 days of point-in-time history. Snapshots run daily, WAL
        # frames every 1s, retention enforced on snapshot.
        retention: 720h
        retention-check-interval: 24h
        snapshot-interval: 24h
        sync-interval: 1s
```

Replace `<account-id>` with the prefix from your R2 endpoint URL.

## 5. Add the credentials to .env

Append to `/mnt/user/appdata/mealplan/.env`:

```
LITESTREAM_ACCESS_KEY_ID=<your access key id>
LITESTREAM_SECRET_ACCESS_KEY=<your secret access key>
```

## 6. Start the sidecar

```sh
ssh unraid
cd /mnt/user/appdata/mealplan
docker compose up -d litestream
docker logs -f mealplan-litestream
```

Expected log lines within a few seconds:

```
level=INFO msg="initialized db" path=/data/mealplan.db
level=INFO msg=replicating name=s3 type=s3 ...
level=INFO msg="write snapshot" db=/data/mealplan.db replica=s3 ...
```

Confirm in the R2 dashboard: bucket → `mealplan-backups` should contain a
`mealplan.db/` directory with `generations/` and `snapshots/` subfolders.

## 7. Drill: restore to a scratch path

**Do this once after setup, and again any time you change Litestream config.**
A backup you've never restored is not a backup.

```sh
ssh unraid
docker run --rm \
  -e LITESTREAM_ACCESS_KEY_ID=$LITESTREAM_ACCESS_KEY_ID \
  -e LITESTREAM_SECRET_ACCESS_KEY=$LITESTREAM_SECRET_ACCESS_KEY \
  -v /mnt/user/appdata/mealplan:/work \
  --env-file /mnt/user/appdata/mealplan/.env \
  litestream/litestream:0.3.13 \
  restore -o /work/restore-test.db \
  s3://mealplan-backups/mealplan.db?endpoint=https://<account-id>.r2.cloudflarestorage.com&region=auto

sqlite3 /mnt/user/appdata/mealplan/restore-test.db 'SELECT COUNT(*) FROM recipes;'
# Should print the same count as prod.
rm /mnt/user/appdata/mealplan/restore-test.db
```

## 8. Disaster recovery — full restore

If the prod DB is lost:

```sh
ssh unraid
docker compose down mealplan
mv /mnt/user/appdata/mealplan/data/mealplan.db /mnt/user/appdata/mealplan/data/mealplan.db.broken.$(date +%s) 2>/dev/null || true
docker run --rm \
  --env-file /mnt/user/appdata/mealplan/.env \
  -v /mnt/user/appdata/mealplan/data:/data \
  litestream/litestream:0.3.13 \
  restore -o /data/mealplan.db \
  s3://mealplan-backups/mealplan.db?endpoint=https://<account-id>.r2.cloudflarestorage.com&region=auto
docker compose up -d mealplan
```

Point-in-time restore (e.g. "the state at 14:30 today"):

```sh
... restore -o /data/mealplan.db \
  -timestamp 2026-05-18T14:30:00Z \
  s3://mealplan-backups/mealplan.db?endpoint=...
```

## 9. Monitoring

Quick sanity check (run from your laptop):

```sh
ssh unraid 'docker logs --tail 20 mealplan-litestream'
```

You want to see recent `sync` lines, no errors. A red flag is repeated
`failed to copy WAL` messages — usually an expired R2 token.

---

## Costs

- Storage: SQLite is ~4 MB. With WAL retention and 30-day history,
  R2 holds ~50 MB max. Well under the 10 GB free tier.
- Class A operations (writes): one per WAL sync. At 1s interval that's
  86,400/day max — under the free tier's 1 million/month.
- Egress: free on R2.

Effective monthly cost: **$0**.

## Why not just `sqlite3 .backup` on cron?

You could, and it'd cover most disaster cases. Litestream wins for two
reasons:

1. **Point-in-time recovery.** A cron'd snapshot at 03:00 means if you
   delete a recipe at 14:00 and notice at 15:00, you lose 12 hours.
   Litestream restores to the second.
2. **No moving parts.** Cron jobs silently break (env vars expire,
   `sqlite3` not installed in the new container image, etc). Litestream
   is a single sidecar that logs every action.
