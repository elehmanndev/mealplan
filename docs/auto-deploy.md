# Auto-deploy on push

This repo auto-deploys to its production host on every push to `main`: a webhook receiver in front of the host validates an HMAC-SHA256 signature, then runs a deploy script that does `git fetch && reset --hard origin/main`, rebuilds the Docker image, and probes a health endpoint.

The pieces that live in this repo are templates — they describe the shape of the pipeline without leaking the actual host:

| Path | Purpose |
|---|---|
| `deploy/webhook/Dockerfile` | Extends [`almir/webhook`](https://github.com/adnanh/webhook) with `git`, `openssh-client`, `docker-cli`, `docker-cli-compose`, `curl`, `bash`. |
| `deploy/webhook/docker-compose.yml` | Brings up the webhook receiver as a **separate compose project** in `network_mode: host`. Separating it from the app's compose project prevents the webhook from cycling itself mid-deploy. |
| `deploy/webhook/deploy.sh` | The actual deploy steps. Bind-mounted into the receiver from the host. |
| `deploy/webhook/hooks.example.yaml` | Template for `hooks.yaml`. Replace `REPLACE_ME_WITH_HEX_SECRET` with 32 random bytes hex (e.g. `openssl rand -hex 32`). The same value goes into the GitHub webhook config. |

The runtime files that **don't** live in git:

- `hooks.yaml` — the webhook routing config (contains the HMAC secret).
- `.secret` — the HMAC secret on disk, mode `0600`.
- A read-only deploy key registered on the GitHub repo, paired with an SSH alias in `~/.ssh/config` so the receiver can `git fetch` over SSH.

The full host-specific runbook (paths, IPs, Cloudflare wiring, bootstrap sequence, secret-rotation procedure) is intentionally not in this public repo. If you're forking and want to reproduce the pipeline: the four files above plus `openssl rand -hex 32` for the secret and a one-time GitHub webhook registration is the whole setup.
