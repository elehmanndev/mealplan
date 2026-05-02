#!/bin/bash
# Triggered by adnanh/webhook on every validated GitHub push to refs/heads/main.
# Runs inside the mealplan-webhook container (almir/webhook + git + docker-cli
# + compose plugin). Host paths are bind-mounted at the same location, so paths
# here are valid both inside the container and on the Unraid host.

set -euo pipefail

cd /mnt/user/appdata/mealplan

git fetch origin main
git reset --hard origin/main

chown -R 1001:1001 data

docker compose up -d --build

sleep 5
curl -fsS http://localhost:3004/api/ingredients/search?q=tomate >/dev/null

echo "[deploy] OK"
