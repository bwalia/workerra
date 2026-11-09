#!/bin/sh
# SC2015: ok/bad always return 0, so "A && ok || bad" never runs both.
# shellcheck disable=SC2015
#
# Tests for Workerra's WSLVault token refresher: the CronJob script
# (deploy/helm/workerra/files/vault-token-refresh.sh), the key script
# (deploy/wslvault-refresher-key.sh) and the chart template. Offline: curl and
# kubectl are stubs, nothing reaches WSLVault or a cluster.
#
# Needs sh, bash, jq, helm. Usage: scripts/test-vault-token-refresh.sh
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
CHART="$ROOT/deploy/helm/workerra"
REFRESH="$CHART/files/vault-token-refresh.sh"
KEYSCRIPT="$ROOT/deploy/wslvault-refresher-key.sh"
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

# Fake credentials, built at run time so no token-shaped literal is in the repo.
b64url() { base64 | tr -d '=\n' | tr '/+' '_-'; }
API_KEY="wslv_$(printf 'refresher-test-key' | b64url)"
NEW_KEY="wslv_$(printf 'minted-test-key' | b64url)"
ADMIN_TOKEN="bootstrap-$(printf 'admin-test' | b64url)"
JWT="$(printf '{"alg":"none"}' | b64url).$(printf '{"sub":"test"}' | b64url).$(printf 'fake' | b64url)"
TENANT=01a1ac98-0000-7000-8000-000000000001
OTHER=01a0f39f-0000-7000-8000-000000000002

pass=0
failures=0
ok() { pass=$((pass + 1)); echo "ok   $*"; }
bad() { failures=$((failures + 1)); echo "FAIL $*"; }

# No credential in the output or in any stub's argv.
no_leak() {
  if grep -q -e "$API_KEY" -e "$NEW_KEY" -e "$ADMIN_TOKEN" -e "$JWT" -e eyJ "$T/out"; then bad "$1: credential in output"; else ok "$1: no credential in output"; fi
  if [ -f "$T/argv" ] && grep -q -e "$API_KEY" -e "$NEW_KEY" -e "$JWT" "$T/argv"; then bad "$1: credential in argv"; else ok "$1: no credential in argv"; fi
}

# ---- refresher -------------------------------------------------------------
mkdir -p "$T/rbin"
cat >"$T/rbin/curl" <<'STUB'
#!/bin/sh
echo "$*" >>"$T/argv"
out= url= data=
while [ $# -gt 0 ]; do
  case "$1" in
    -o) out=$2; shift ;;
    --data-binary) data=${2#@}; shift ;;
    -w | --connect-timeout | --max-time | -X | -H | --proto) shift ;;
    http*) url=$1 ;;
  esac
  shift
done
case "$SCEN" in
  netdown) echo "curl: (7) Failed to connect" >&2; exit 7 ;;
  trunc) printf '{"token":"' >"$out"; printf 200; echo "curl: (28) Operation timed out" >&2; exit 28 ;;
esac
jq -e --arg k "$API_KEY" '.api_key == $k' "$data" >/dev/null || { echo '{"errors":["bad key"]}' >"$out"; printf 400; exit 0; }
ten=$TENANT
case "$SCEN" in
  wrongtenant) ten=$OTHER ;;
  mfa) echo '{"mfa_required":true,"challenge":"c"}' >"$out"; printf 200; exit 0 ;;
  notfound) echo '{"code":"key_not_found","message":"api key not found"}' >"$out"; printf 404; exit 0 ;;
  notoken) printf '{"token":"","tenant_id":"%s"}' "$ten" >"$out"; printf 200; exit 0 ;;
esac
printf '{"token":"%s","expires_at":"2099-01-01T00:00:00Z","tenant_id":"%s","policies":["workerra-read"]}' "$JWT" "$ten" >"$out"
printf 200
STUB
cat >"$T/rbin/kubectl" <<'STUB'
#!/bin/sh
echo "$*" >>"$T/argv"
while [ $# -gt 0 ]; do [ "$1" = --patch-file ] && cp "$2" "$T/patch.json"; shift; done
[ "$SCEN" = kubefail ] && { echo 'Error from server (Forbidden): denied' >&2; exit 1; }
echo 'secret/workerra-vault-token patched'
STUB
chmod +x "$T/rbin/"*

run_refresh() {
  scen=$1
  shift
  rm -rf "$T/key" "$T/work" "$T/argv" "$T/patch.json"
  mkdir -p "$T/key" "$T/work"
  printf '%s\n' "$API_KEY" >"$T/key/api_key"
  printf '%s\n' "$TENANT" >"$T/key/tenant_id"
  case "$scen" in nokey) rm "$T/key/api_key" ;; notenant) rm "$T/key/tenant_id" ;; esac
  rc=0
  env PATH="$T/rbin:$PATH" T="$T" SCEN="$scen" API_KEY="$API_KEY" JWT="$JWT" TENANT="$TENANT" OTHER="$OTHER" \
    VAULT_ADDR=https://vault.example NAMESPACE=int TARGET_SECRET=workerra-vault-token \
    KEY_DIR="$T/key" WORK="$T/work" "$@" sh "$REFRESH" >"$T/out" 2>&1 || rc=$?
}

refresh_ok() {
  run_refresh "$1"
  if [ "$rc" -eq 0 ] && grep -q "refreshed workerra vault session for tenant $TENANT" "$T/out" &&
    jq -e --arg j "$JWT" '(.data.token | @base64d) == $j and (keys == ["data"])' "$T/patch.json" >/dev/null; then
    ok "refresh $1: token patched"
  else bad "refresh $1: expected success (rc=$rc): $(tail -1 "$T/out")"; fi
  grep -q -- "-n int patch secret workerra-vault-token --type merge --patch-file patch.json" "$T/argv" &&
    ok "refresh $1: patches only int/workerra-vault-token" || bad "refresh $1: unexpected kubectl call"
  [ -z "$(ls -A "$T/work")" ] && ok "refresh $1: work dir cleaned" || bad "refresh $1: left $(ls "$T/work")"
  no_leak "refresh $1"
}

refresh_fails() {
  scen=$1
  msg=$2
  run_refresh "$scen"
  [ "$rc" -ne 0 ] && grep -q -- "$msg" "$T/out" && ok "refresh $scen: fails with '$msg'" ||
    bad "refresh $scen: expected '$msg' (rc=$rc): $(tail -1 "$T/out")"
  if [ -f "$T/patch.json" ] && [ "$scen" != kubefail ]; then bad "refresh $scen: wrote the Secret"; else ok "refresh $scen: Secret not written"; fi
  [ -z "$(ls -A "$T/work")" ] && ok "refresh $scen: work dir cleaned" || bad "refresh $scen: left $(ls "$T/work")"
  no_leak "refresh $scen"
}

echo "== refresher (vault-token-refresh.sh)"
refresh_ok ok
refresh_fails wrongtenant "key is in tenant '$OTHER', expected $TENANT; not updating"
refresh_fails mfa "this key requires MFA"
refresh_fails notfound "api-key exchange failed: HTTP 404"
refresh_fails notoken "no token in response"
refresh_fails netdown "Failed to connect"
refresh_fails trunc "Operation timed out"
refresh_fails kubefail "Forbidden"
refresh_fails nokey "no api_key in the API key Secret"
refresh_fails notenant "no tenant_id in the API key Secret"

# ---- key script ------------------------------------------------------------
mkdir -p "$T/kbin"
cat >"$T/kbin/curl" <<'STUB'
#!/bin/sh
echo "$*" >>"$T/argv"
url=
for a in "$@"; do case "$a" in http*) url=$a ;; esac; done
body=$(cat)
case "$url" in
  */v1/auth/api-key)
    k=$(printf '%s' "$body" | jq -r .api_key)
    if [ "$k" = "$NEW_KEY" ]; then
      ten=$TENANT pol='["workerra-read"]' mfa=false
      case "$SCEN" in newother) ten=$OTHER ;; newpolicy) pol='["workerra-read","admin"]' ;; newmfa) mfa=true ;; esac
      printf '{"token":"%s","tenant_id":"%s","policies":%s,"mfa_required":%s}\n200' "$JWT" "$ten" "$pol" "$mfa"
    else
      printf '{"token":"%s","tenant_id":"%s","policies":["admin"]}\n200' "$JWT" "$OTHER"
    fi ;;
  */v1/api-keys)
    echo "$body" >"$T/mint.json"
    printf '{"id":"key-1","key":"%s"}\n201' "$NEW_KEY" ;;
  *) printf '{}\n404' ;;
esac
STUB
cat >"$T/kbin/kubectl" <<'STUB'
#!/bin/sh
echo "$*" >>"$T/argv"
case "$*" in
  *" get secret "*) [ "$SCEN" = exists ] && exit 0; exit 1 ;;
  *" create secret generic "*) cat >"$T/stored_key"; echo "$*" >"$T/create_args"; echo "secret/x created" ;;
esac
STUB
chmod +x "$T/kbin/"*

run_key() {
  scen=$1
  cred=$2
  rm -f "$T/argv" "$T/stored_key" "$T/create_args" "$T/mint.json"
  rc=0
  env PATH="$T/kbin:$PATH" T="$T" SCEN="$scen" NEW_KEY="$NEW_KEY" JWT="$JWT" TENANT="$TENANT" OTHER="$OTHER" \
    WSLVAULT_ADMIN_CREDENTIAL="$cred" bash "$KEYSCRIPT" >"$T/out" 2>&1 </dev/null || rc=$?
}

echo "== key script (wslvault-refresher-key.sh)"
run_key ok "$ADMIN_TOKEN"
if [ "$rc" -eq 0 ] && [ "$(cat "$T/stored_key")" = "$NEW_KEY" ]; then ok "key ok: key stored from stdin"; else bad "key ok: not stored (rc=$rc): $(tail -2 "$T/out")"; fi
grep -q -- "-n int create secret generic workerra-vault-apikey --from-file=api_key=/dev/stdin --from-literal=tenant_id=$TENANT" "$T/create_args" &&
  ok "key ok: int/workerra-vault-apikey with api_key and tenant_id" || bad "key ok: wrong create: $(cat "$T/create_args")"
jq -e --arg t "$TENANT" '.tenant_id == $t and .policies == ["workerra-read"] and .mfa_required == false' "$T/mint.json" >/dev/null &&
  ok "key ok: mints workerra-read, no MFA, in the tenant" || bad "key ok: mint request $(cat "$T/mint.json")"
no_leak "key ok"

key_refused() {
  scen=$1
  cred=$2
  msg=$3
  run_key "$scen" "$cred"
  [ "$rc" -ne 0 ] && grep -q -- "$msg" "$T/out" && ok "key $scen: refused ($msg)" || bad "key $scen: expected '$msg' (rc=$rc): $(tail -2 "$T/out")"
  [ ! -f "$T/stored_key" ] && ok "key $scen: nothing stored" || bad "key $scen: stored a key"
  no_leak "key $scen"
}
key_refused newother "$ADMIN_TOKEN" "Not stored. Revoke it"
key_refused newpolicy "$ADMIN_TOKEN" "Not stored. Revoke it"
key_refused newmfa "$ADMIN_TOKEN" "Not stored. Revoke it"
key_refused otheradmin "$API_KEY" "can only create keys in its own tenant"
run_key exists "$ADMIN_TOKEN"
[ "$rc" -eq 0 ] && grep -q "already exists" "$T/out" && [ ! -f "$T/mint.json" ] &&
  ok "key exists: leaves the existing Secret, mints nothing" || bad "key exists: $(tail -1 "$T/out")"

# ---- chart -----------------------------------------------------------------
echo "== chart"
render() { helm template workerra "$CHART" -n int --set image.tag=test "$@"; }
render -f "$CHART/values-int.yaml" >"$T/int.yaml"
doc() { awk -v k="kind: $1" -v n="  name: $2" 'BEGIN{RS="\n---\n"} index($0,k) && index($0,n) {print}' "$T/int.yaml"; }
cron=$(doc CronJob workerra-vault-token-refresh)
role=$(doc Role workerra-vault-token-refresh)

has() { echo "$1" | grep -Eq -- "$2" && ok "$3" || bad "$3"; }
# The shared refresher's settings (wslvpn/deploy/environments/k3s1/wslvault-store.yaml).
has "$cron" 'schedule: "\*/30 \* \* \* \*"' "schedule */30, as the shared refresher"
has "$cron" 'image: "alpine/k8s:1\.30\.2"' "image alpine/k8s:1.30.2, as the shared refresher"
has "$cron" 'restartPolicy: OnFailure' "restartPolicy OnFailure"
has "$cron" 'backoffLimit: 3' "backoffLimit 3"
has "$cron" 'activeDeadlineSeconds: 300' "activeDeadlineSeconds 300"
has "$cron" 'concurrencyPolicy: Forbid' "concurrencyPolicy Forbid"
has "$cron" 'runAsUser: 65534' "runs as 65534"
has "$cron" 'readOnlyRootFilesystem: true' "read-only root filesystem"
has "$cron" 'drop: \[ALL\]' "drops all capabilities"
has "$cron" 'defaultMode: 0440' "key mounted 0440"
has "$cron" 'emptyDir: \{ medium: Memory, sizeLimit: 1Mi \}' "work dir in memory, 1Mi"
has "$cron" 'secretName: "workerra-vault-apikey"' "mounts int/workerra-vault-apikey"
has "$cron" 'name: TARGET_SECRET, value: "workerra-vault-token"' "targets workerra-vault-token"
has "$role" 'verbs: \[get, patch\]' "Role verbs get, patch"
has "$role" 'resourceNames: \["workerra-vault-token"\]' "Role scoped to workerra-vault-token"
[ "$(echo "$role" | grep -c resourceNames)" -eq 1 ] && ok "Role has one rule" || bad "Role has extra rules"
if render | grep -q workerra-vault-token-refresh; then bad "base values render the refresher"; else ok "off by default"; fi

guard() {
  if out=$(render -f "$CHART/values-int.yaml" "$@" 2>&1); then bad "guard did not fire: $*"; else
    echo "$out" | grep -q -e "needs ownVaultStore.enabled" -e "must be an https:// URL" -e "must differ" &&
      ok "guard: $*" || bad "guard wrong message: $out"
  fi
}
guard --set ownVaultStore.enabled=false
guard --set ownVaultStore.server=http://vault.example
guard --set ownVaultStore.tokenRefresh.apiKeySecret=workerra-vault-token

echo
echo "$pass passed, $failures failed"
[ "$failures" -eq 0 ]
