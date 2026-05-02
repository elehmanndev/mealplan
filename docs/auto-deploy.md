# Auto-deploy on push

GitHub push to `main` → Cloudflare Tunnel → `mealplan-webhook` container on Unraid → HMAC-SHA256 validation → `deploy.sh` → `git fetch && reset --hard` + `docker compose up -d --build` + health probe.

## Components

| Path | In git? | Purpose |
|---|---|---|
| `deploy/webhook/Dockerfile` | yes | Extends `almir/webhook` with `git`, `docker-cli`, `docker-cli-compose`, `curl`, `bash`. |
| `deploy/webhook/docker-compose.yml` | yes | Brings up `mealplan-webhook` as a **separate compose project** in `network_mode: host`. |
| `deploy/webhook/deploy.sh` | yes — symlinked at `/mnt/user/appdata/mealplan-webhook/deploy.sh` | The actual deploy steps. Updates flow via `git pull`. |
| `deploy/webhook/hooks.example.yaml` | yes | Template for `hooks.yaml`. |
| `/mnt/user/appdata/mealplan-webhook/hooks.yaml` | **no** (contains HMAC secret) | Webhook routing + HMAC validation rule. |
| `/mnt/user/appdata/mealplan-webhook/.secret` | **no** | The HMAC secret in plain text, mode 0600. Same value also lives inside `hooks.yaml`. |

## Why a separate compose project?

`deploy.sh` runs `docker compose up -d --build` against the **app** project (`/mnt/user/appdata/mealplan/docker-compose.yml`, project name `mealplan`). If the webhook were a service in the same compose file, the deploy would tear down its own runtime mid-execution. The webhook runs as project name `mealplan-webhook` instead.

## Why `network_mode: host`?

The deploy.sh health probe curls `http://localhost:3004` — that's the app's published host port. Host networking gives the webhook container direct access to the host loopback without joining the app's docker network. Side effect: the webhook listens on the host's `:9000` directly (no port-mapping needed in compose).

## Operating

- **Logs:** `docker logs --tail 100 -f mealplan-webhook` (request arrival, HMAC validation, deploy.sh stdout/stderr).
- **Reload after editing `hooks.yaml`:** `docker restart mealplan-webhook`.
- **Updating `deploy.sh`:** push to `main`. The script is symlinked from the cloned repo, the bind mount resolves the symlink target at container start, and the next webhook invocation picks up the new file.
- **Updating the Dockerfile:** the webhook never deploys itself — rebuild manually: `docker compose -f /mnt/user/appdata/mealplan/deploy/webhook/docker-compose.yml -p mealplan-webhook up -d --build`.
- **Rotating the HMAC secret:** generate a new one, write into `hooks.yaml` and `.secret`, `docker restart mealplan-webhook`, update the secret in the GitHub webhook config.
- **Disabling auto-deploy temporarily:** `docker stop mealplan-webhook`. The app keeps running; pushes are silently ignored.

## First-time bootstrap

Eric does:

1. **Add the deploy key to GitHub** — paste `/root/.ssh/mealplan_deploy.pub` (from Unraid) into Repo → Settings → Deploy keys → Add deploy key. Read-only.
2. **Add a Cloudflare Tunnel public hostname** — Zero Trust → Networks → Tunnels → `Unraid-Cloudflared-Tunnel` → Public Hostnames → Add. Subdomain `mealplan-deploy`, service `http://192.168.1.45:9000`. **No Access policy** in front (GitHub needs to reach it; HMAC is the only auth).
3. **Swap the tar-shipped tree for a real clone** (one-shot from your laptop):

   ```bash
   ssh unraid 'bash -s' <<'EOF'
   set -euo pipefail
   cd /mnt/user/appdata
   docker stop mealplan
   mv mealplan mealplan.bak.$(date +%s)
   GIT_SSH_COMMAND="ssh -i /root/.ssh/mealplan_deploy -o IdentitiesOnly=yes" \
     git clone git@github-mealplan:ericll93/mealplan.git mealplan
   BAK=$(ls -td mealplan.bak.* | head -1)
   mv "$BAK/data" mealplan/data
   chown -R 1001:1001 mealplan/data
   ln -sf /mnt/user/appdata/mealplan/deploy/webhook/deploy.sh /mnt/user/appdata/mealplan-webhook/deploy.sh
   docker compose -f /mnt/user/appdata/mealplan/deploy/webhook/docker-compose.yml -p mealplan-webhook up -d --build
   cd mealplan && docker compose up -d --build
   EOF
   ```

4. **Register the GitHub webhook** — Repo → Settings → Webhooks → Add webhook. URL `https://mealplan-deploy.<your-tunnel-base-domain>/hooks/mealplan-deploy`. Content type `application/json`. Secret: `cat /mnt/user/appdata/mealplan-webhook/.secret`. SSL verification on. Events: "Just the push event". Active.
5. **Test** — push a trivial change to `main` and watch `docker logs -f mealplan-webhook`. After the deploy succeeds, `rm -rf /mnt/user/appdata/mealplan.bak.*`.
