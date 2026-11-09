#!/bin/sh
# Exchange Workerra's WSLVault machine API key for a fresh session JWT and
# write it to the Secret the workerra-vault SecretStore authenticates with.
#
# WSLVault session JWTs live one hour (identity-service API_KEY_JWT_TTL_SECONDS)
# and ESO accepts only a JWT, so this runs from a CronJob well inside that hour.
#
# Secrets never reach argv, stdout or stderr: the key is read from the mounted
# Secret by jq and sent on curl's stdin, the token travels in files in the pod's
# in-memory emptyDir and in a curl header file, and error output carries only
# the HTTP status and the server's short message.
#
# Env: VAULT_ADDR, NAMESPACE, TARGET_SECRET, EXPECTED_POLICIES (comma list),
#      MAX_ATTEMPTS (default 5), KEY_DIR (default /key), WORK (default /work).
# Key dir: api_key (wslv_...) and tenant_id (the tenant the key must belong to).
set -eu
umask 077

: "${VAULT_ADDR:?VAULT_ADDR is required}"
: "${NAMESPACE:?NAMESPACE is required}"
: "${TARGET_SECRET:?TARGET_SECRET is required}"
: "${EXPECTED_POLICIES:?EXPECTED_POLICIES is required}"
KEY_DIR=${KEY_DIR:-/key}
WORK=${WORK:-/work}
MAX_ATTEMPTS=${MAX_ATTEMPTS:-5}

NAME=workerra-vault-token-refresh
log() { echo "$NAME: $*"; }
fail() {
  echo "$NAME: $*" >&2
  exit 1
}

cleanup() {
  rm -f "$WORK/req.json" "$WORK/resp.json" "$WORK/exchange.json" "$WORK/hdr" \
    "$WORK/lookup.json" "$WORK/patch.json"
}
trap cleanup EXIT
trap 'cleanup; exit 1' INT TERM

[ -s "$KEY_DIR/api_key" ] || fail "key 'api_key' is missing from the API key Secret"
[ -s "$KEY_DIR/tenant_id" ] || fail "key 'tenant_id' is missing from the API key Secret"
expected_tenant=$(tr -d ' \t\r\n' <"$KEY_DIR/tenant_id")
[ -n "$expected_tenant" ] || fail "tenant_id in the API key Secret is empty"

# Only the server's code/message, capped: never the body itself.
err_summary() {
  jq -r '[.code?, .message?] | map(select(. != null) | tostring) | join(": ")' "$1" 2>/dev/null |
    tr -d '\r\n' | cut -c1-160 || true
}

# with_retry <label> <cmd...>: the command sets $code. Retries network errors,
# 408, 425, 429 and 5xx with exponential backoff; anything else is final.
with_retry() {
  label=$1
  shift
  attempt=1
  delay=5
  while :; do
    code=000
    "$@"
    case "$code" in
      2??) return 0 ;;
      000 | 408 | 425 | 429 | 5??) ;;
      *) fail "$label refused: HTTP $code $(err_summary "$WORK/resp.json")" ;;
    esac
    [ "$attempt" -lt "$MAX_ATTEMPTS" ] ||
      fail "$label failed after $attempt attempts: HTTP $code $(err_summary "$WORK/resp.json")"
    log "$label attempt $attempt failed (HTTP $code); retrying in ${delay}s"
    sleep "$delay"
    attempt=$((attempt + 1))
    delay=$((delay * 2))
  done
}

exchange() {
  rm -f "$WORK/resp.json"
  jq -nc --rawfile k "$KEY_DIR/api_key" '{api_key: ($k | gsub("^\\s+|\\s+$"; ""))}' >"$WORK/req.json"
  code=$(curl -sS -o "$WORK/resp.json" -w '%{http_code}' --connect-timeout 10 --max-time 30 \
    -X POST -H 'Content-Type: application/json' --data-binary @"$WORK/req.json" \
    "$VAULT_ADDR/v1/auth/api-key") || true
  rm -f "$WORK/req.json"
}

# ESO validates a store through lookup-self, so the new token must pass it too.
lookup() {
  rm -f "$WORK/lookup.json"
  code=$(curl -sS -o "$WORK/lookup.json" -w '%{http_code}' --connect-timeout 10 --max-time 30 \
    -H @"$WORK/hdr" "$VAULT_ADDR/v1/auth/token/lookup-self") || true
  cp "$WORK/lookup.json" "$WORK/resp.json" 2>/dev/null || true
}

patch_secret() {
  if kubectl -n "$NAMESPACE" patch secret "$TARGET_SECRET" --type merge \
    --patch-file "$WORK/patch.json" >/dev/null; then
    code=200
  else
    code=500
  fi
}

# 1. Exchange the API key for a session token.
with_retry "api-key exchange" exchange

# 2. Check what came back before trusting it.
jq -e . "$WORK/resp.json" >/dev/null 2>&1 || fail "exchange returned a non-JSON body"
if [ "$(jq -r '.mfa_required // false' "$WORK/resp.json")" = true ]; then
  fail "this API key requires MFA; the refresher needs a machine key without it"
fi
tenant=$(jq -r '.tenant_id // empty' "$WORK/resp.json")
[ "$tenant" = "$expected_tenant" ] ||
  fail "API key belongs to tenant '${tenant:-unknown}', expected '$expected_tenant'; not updating"

# The key must carry exactly the expected policies, and never an admin one:
# a broader key would hand ESO (and anyone who can read its Secret) more than
# a read of this ring's secrets.
got=$(jq -r '(.policies // []) | sort | join(",")' "$WORK/resp.json")
want=$(jq -rn --arg p "$EXPECTED_POLICIES" '$p | split(",") | map(gsub("^\\s+|\\s+$"; "")) | map(select(length > 0)) | sort | join(",")')
[ "$got" = "$want" ] || fail "API key policies are [$got], expected [$want]; not updating"
if jq -e '(.policies // []) | map(select(. == "root" or . == "admin" or . == "wslvault:platform-admin")) | length > 0' \
  "$WORK/resp.json" >/dev/null; then
  fail "API key carries an administrative policy; use a read-only machine key"
fi

jq -e '.token | type == "string" and test("^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$")' \
  "$WORK/resp.json" >/dev/null || fail "exchange response has no well-formed token"
expires_at=$(jq -r '.expires_at // empty' "$WORK/resp.json")
remaining=$(jq -r '(.expires_at | sub("\\.[0-9]+"; "") | sub("\\+00:00$"; "Z") | fromdateiso8601) - now | floor' \
  "$WORK/resp.json" 2>/dev/null) || fail "exchange response has an unreadable expires_at"
[ "$remaining" -gt 300 ] || fail "new token expires in ${remaining}s; refusing to store it"

# 3. Prove the token works for the call ESO makes, in the expected tenant.
jq -r '"X-Vault-Token: " + .token' "$WORK/resp.json" >"$WORK/hdr"
cp "$WORK/resp.json" "$WORK/exchange.json"
with_retry "token lookup" lookup
rm -f "$WORK/hdr"
mv "$WORK/exchange.json" "$WORK/resp.json"
looked_up=$(jq -r '.data.meta.tenant_id // empty' "$WORK/lookup.json")
[ "$looked_up" = "$expected_tenant" ] ||
  fail "lookup-self reports tenant '${looked_up:-unknown}', expected '$expected_tenant'; not updating"

# 4. One merge patch: the token and its (non-secret) expiry land together.
now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
jq -c --arg now "$now" --arg exp "$expires_at" '{
  metadata: {annotations: {
    "workerra.uk/token-refreshed-at": $now,
    "workerra.uk/token-expires-at": $exp
  }},
  data: {token: (.token | @base64)}
}' "$WORK/resp.json" >"$WORK/patch.json"
rm -f "$WORK/resp.json" "$WORK/lookup.json"
with_retry "secret update" patch_secret

log "refreshed $NAMESPACE/$TARGET_SECRET for tenant $tenant; token expires $expires_at"
