#!/usr/bin/env bash
# Create or top up a ring's WSL Vault path workerra/<ring>/core, idempotently.
#
#   VAULT_TOKEN=... deploy/vault-seed.sh int
#   VAULT_TOKEN=... CONTACT_EMAIL=team@workerra.uk deploy/vault-seed.sh int
#
# - SESSION_SECRET: generated once (openssl rand -hex 32). An existing valid one
#   is never replaced, so recruiter sessions survive re-runs.
# - CONTACT_EMAIL: written only when set in the environment.
# - Every other key already at the path is kept as it is.
# - The write is check-and-set on the version it read: a concurrent edit makes it
#   fail instead of being overwritten.
# - Prints key names only, never values.
#
# PROD lives in a separate prod-only Vault tenant (docs/environments.md), so this
# refuses it. External Secrets picks the change up within a minute; the first
# creation of a path also needs a pod restart (or a redeploy from Ring Promoter).
set -euo pipefail

ring=${1:-}
case "$ring" in
  int | test | acc) ;;
  *) echo "usage: VAULT_TOKEN=... $0 int|test|acc" >&2; exit 2 ;;
esac
: "${VAULT_TOKEN:?VAULT_TOKEN must be set (a WSL Vault token that can write kv/workerra/$ring/*)}"
VAULT_ADDR=${VAULT_ADDR:-https://vault.workstation.co.uk}
url="$VAULT_ADDR/v1/kv/data/workerra/$ring/core"

if [ -n "${CONTACT_EMAIL:-}" ] && ! [[ "$CONTACT_EMAIL" =~ ^[^[:space:]@,\;?\&]+@[^[:space:]@,\;?\&]+\.[^[:space:]@,\;?\&]+$ ]]; then
  echo "CONTACT_EMAIL must be a single email address" >&2
  exit 2
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
# The token reaches curl through a config on a pipe (printf is a builtin),
# never in argv, where any local user could see it in the process list.
auth() { printf 'header = "X-Vault-Token: %s"\n' "$VAULT_TOKEN"; }

code=$(curl -sS -o "$tmp/current.json" -w '%{http_code}' -K <(auth) "$url")
case "$code" in
  200) ;;
  404) echo '{"data":{"data":{},"metadata":{"version":0}}}' > "$tmp/current.json" ;;
  *) echo "reading $url failed: HTTP $code" >&2; exit 1 ;;
esac

new_secret=""
current_secret=$(jq -r '.data.data.SESSION_SECRET // ""' "$tmp/current.json")
if [ "${#current_secret}" -lt 32 ]; then
  new_secret=$(openssl rand -hex 32)
fi

# Values travel through the environment into jq and the request body on stdin,
# never on a command line.
NEW_SECRET="$new_secret" jq '
  {options: {cas: .data.metadata.version},
   data: (.data.data
          + (if env.NEW_SECRET != "" then {SESSION_SECRET: env.NEW_SECRET} else {} end)
          + (if (env.CONTACT_EMAIL // "") != "" then {CONTACT_EMAIL: env.CONTACT_EMAIL} else {} end))}
' "$tmp/current.json" > "$tmp/body.json"

if jq -e --slurpfile cur "$tmp/current.json" '.data == $cur[0].data.data' "$tmp/body.json" >/dev/null; then
  echo "kv/workerra/$ring/core is up to date: $(jq -r '.data | keys | join(", ")' "$tmp/body.json")"
  exit 0
fi

code=$(curl -sS -o "$tmp/write.json" -w '%{http_code}' -X POST \
  -K <(auth) -H 'Content-Type: application/json' \
  --data-binary @- "$url" < "$tmp/body.json")
[ "$code" = 200 ] || { echo "writing $url failed: HTTP $code $(head -c 300 "$tmp/write.json")" >&2; exit 1; }

version=$(jq -r '.data.version' "$tmp/write.json")
echo "kv/workerra/$ring/core version $version: $(jq -r '.data | keys | join(", ")' "$tmp/body.json")"
if [ -n "$new_secret" ]; then echo "SESSION_SECRET generated (existing recruiter sessions are signed out)"; fi
if [ "$version" = 1 ]; then
  echo "New path: Reloader ignores a Secret's first creation, so restart once: kubectl -n $ring rollout restart deploy/workerra (or redeploy from Ring Promoter)"
else
  echo "Reloader rolls the pods once External Secrets refreshes (within ~1m)"
fi
