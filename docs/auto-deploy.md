# Auto-deploy on push

GitHub push to `main` → Cloudflare Tunnel → `mealplan-webhook` container on Unraid → HMAC-SHA256 validation → `deploy.sh` → `git fetch && reset --hard` + `docker compose up -d --build` + health probe.

## Components

| Path | In git? | Purpose |
|---|---|---|
| `deploy/webhook/Dockerfile` | yes | Extends `almir/webhook` with `git`, `openssh-client`, `docker-cli`, `docker-cli-compose`, `curl`, `bash`. |
| `deploy/webhook/docker-compose.yml` | yes | Brings up `mealplan-webhook` as a **separate compose project** in `network_mode: host`. |
| `deploy/webhook/deploy.sh` | yes — canonical version, mode `100755` | The actual deploy steps. Copied to the host path during bootstrap; future updates require a manual `cp` (see *Operating*). |
| `deploy/webhook/hooks.example.yaml` | yes | Template for `hooks.yaml`. |
| `/mnt/user/appdata/mealplan-webhook/hooks.yaml` | **no** (contains HMAC secret) | Webhook routing + HMAC validation rule. |
| `/mnt/user/appdata/mealplan-webhook/deploy.sh` | **no** | Live copy of `deploy.sh`, bind-mounted into the container. |
| `/mnt/user/appdata/mealplan-webhook/.secret` | **no** | HMAC secret in plain text, mode `0600`. Same value also lives inside `hooks.yaml`. |
| `/root/.ssh/mealplan_deploy{,.pub}` | **no** | Deploy keypair on the Unraid host. Mounted read-only into the webhook container so `git fetch` over SSH works. |

## Why a separate compose project?

`deploy.sh` runs `docker compose up -d --build` against the **app** project (`/mnt/user/appdata/mealplan/docker-compose.yml`, project name `mealplan`). If the webhook were a service in the same compose file, the deploy would tear down its own runtime mid-execution. The webhook runs as project name `mealplan-webhook` instead.

## Why `network_mode: host`?

The deploy.sh health probe curls `http://localhost:3004` — that's the app's published host port. Host networking gives the webhook container direct access to the host loopback without joining the app's docker network. Side effect: the webhook listens on the host's `:9000` directly (no port-mapping needed in compose).

## Why bind-mount `/root/.ssh:ro` into the webhook?

The cloned repo's remote is the SSH alias `git@github-mealplan:...` (`Host github-mealplan` lives in `/root/.ssh/config`, identity is `/root/.ssh/mealplan_deploy`). The webhook container needs both the binary (`openssh-client` from the Dockerfile) and the keys/config (the bind mount) to fetch.

## Operating

- **Logs:** `docker logs --tail 100 -f mealplan-webhook` (request arrival, HMAC validation, deploy.sh stdout/stderr).
- **Reload after editing `hooks.yaml`:** `docker restart mealplan-webhook`.
- **Updating `deploy.sh`:** edit the canonical version in this repo, merge to `main`, then on the next deploy *or* manually:
  ```bash
  ssh unraid 'cp /mnt/user/appdata/mealplan/deploy/webhook/deploy.sh /mnt/user/appdata/mealplan-webhook/deploy.sh && chmod +x /mnt/user/appdata/mealplan-webhook/deploy.sh'
  ```
  (Docker can't bind-mount a symlink as a single file, so we keep `deploy.sh` as a regular file at the host path.)
- **Updating the Dockerfile or compose:** the webhook never deploys itself — rebuild manually:
  ```bash
  ssh unraid 'cd /mnt/user/appdata/mealplan-webhook && docker compose -p mealplan-webhook up -d --build'
  ```
- **Rotating the HMAC secret:** generate a new one, write into `hooks.yaml` and `.secret`, `docker restart mealplan-webhook`, then update the secret in the GitHub webhook config.
- **Disabling auto-deploy temporarily:** `docker stop mealplan-webhook`. The app keeps running; pushes are silently ignored.

## First-time bootstrap

1. **Add the deploy key to GitHub** — paste `/root/.ssh/mealplan_deploy.pub` (from Unraid) into Repo → Settings → Deploy keys → Add deploy key. Read-only.
2. **Add a Cloudflare Tunnel public hostname** — Zero Trust → Networks → Tunnels → `Unraid-Cloudflared-Tunnel` → Public Hostnames → Add. Subdomain `mealplan-deploy`, service `http://***REDACTED-LAN-IP***:9000`. **No Access policy** in front (GitHub needs to reach it; HMAC is the only auth).
3. **Swap the tar-shipped tree for a real clone** (one-shot from your laptop):

   ```bash
   ssh unraid 'bash -s' <<'EOF'
   set -euo pipefail
   cd /mnt/user/appdata
   docker stop mealplan
   mv mealplan mealplan.bak.$(date +%s)
   GIT_SSH_COMMAND="ssh -i /root/.ssh/mealplan_deploy -o IdentitiesOnly=yes" \
     git clone git@github-mealplan:elehmanndev/mealplan.git mealplan
   BAK=$(ls -td mealplan.bak.* | head -1)
   mv "$BAK/data" mealplan/data
   chown -R 1001:1001 mealplan/data
   cp mealplan/deploy/webhook/deploy.sh mealplan-webhook/deploy.sh
   chmod +x mealplan-webhook/deploy.sh
   docker compose -f mealplan/deploy/webhook/docker-compose.yml -p mealplan-webhook up -d --build
   cd mealplan && docker compose up -d --build
   EOF
   ```

4. **Register the GitHub webhook** — Repo → Settings → Webhooks → Add webhook. URL `https://mealplan-deploy.<your-tunnel-base-domain>/hooks/mealplan-deploy`. Content type `application/json`. Secret: `cat /mnt/user/appdata/mealplan-webhook/.secret`. SSL verification on. Events: "Just the push event". Active.
5. **Test** — push a trivial change to `main` and watch `docker logs -f mealplan-webhook`. After the deploy succeeds end-to-end, `rm -rf /mnt/user/appdata/mealplan.bak.*`.
