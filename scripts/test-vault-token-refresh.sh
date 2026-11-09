#!/bin/sh
# SC2015: ok/bad always return 0, so "A && ok || bad" never runs both.
# shellcheck disable=SC2015
# Tests for the WSLVault token refresher (deploy/helm/workerra/files/
# vault-token-refresh.sh) and its chart template. Runs offline: curl, kubectl
# and sleep are stubs, nothing reaches WSLVault or a cluster.
#
# Needs sh, jq, helm. Usage: scripts/test-vault-token-refresh.sh
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
CHART="$ROOT/deploy/helm/workerra"
SCRIPT="$CHART/files/vault-token-refresh.sh"
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

API_KEY='wslv_TESTSECRETAPIKEY0123456789'
# A fake, unsigned JWT-shaped string, built at run time so no token-shaped
# literal sits in the repo (secret scanners rightly flag those).
b64url() { base64 | tr -d '=\n' | tr '/+' '_-'; }
JWT="$(printf '{"alg":"none"}' | b64url).$(printf '{"sub":"test"}' | b64url).$(printf 'fake' | b64url)"

pass=0
failures=0
ok() {
  pass=$((pass + 1))
  echo "ok   $*"
}
bad() {
  failures=$((failures + 1))
  echo "FAIL $*"
}

# ---- stubs -----------------------------------------------------------------
mkdir -p "$T/bin"
cat >"$T/bin/curl" <<'STUB'
#!/bin/sh
# Answers per $SCEN; counts calls in $T/calls; logs argv to $T/argv.
echo "$*" >>"$T/argv"
out= url= hdr= data=
while [ $# -gt 0 ]; do
  case "$1" in
    -o) out=$2; shift ;;
    -H) case "$2" in @*) hdr=${2#@} ;; esac; shift ;;
    --data-binary) data=${2#@}; shift ;;
    -w | --connect-timeout | --max-time | -X | --proto) shift ;;
    http*) url=$1 ;;
  esac
  shift
done
n=$(($(cat "$T/calls" 2>/dev/null || echo 0) + 1))
echo "$n" >"$T/calls"
exp=$(jq -rn 'now + 3600 | todate | sub("Z$"; ".123456789Z")')
case "$url" in
  */v1/auth/api-key)
    jq -e --arg k "$API_KEY" '.api_key == $k' "$data" >/dev/null || { echo '{"message":"bad key"}' >"$out"; printf 400; exit 0; }
    ten=T1 pol='["workerra-int-eso-read"]'
    case "$SCEN" in
      wrongtenant) ten=T2 ;;
      extrapol) pol='["workerra-int-eso-read","admin"]' ;;
      mfa) echo '{"mfa_required":true,"challenge":"c"}' >"$out"; printf 200; exit 0 ;;
      notfound) echo '{"code":"key_not_found","message":"api key not found"}' >"$out"; printf 404; exit 0 ;;
      forbid) echo '{"errors":["no policy grants read"]}' >"$out"; printf 403; exit 0 ;;
      flaky) [ "$n" -ge 3 ] || { echo '{"message":"down"}' >"$out"; printf 503; exit 0; } ;;
      netdown) printf 000; exit 7 ;;
      trunc) [ "$n" -ge 2 ] || { printf '{"token":"eyJ' >"$out"; printf 200; exit 28; } ;;
      shortlived) exp=$(jq -rn 'now + 60 | todate') ;;
      badtoken) printf '{"token":"not-a-jwt","expires_at":"%s","tenant_id":"T1","policies":["workerra-int-eso-read"]}' "$exp" >"$out"; printf 200; exit 0 ;;
    esac
    printf '{"token":"%s","expires_at":"%s","tenant_id":"%s","policies":%s}' "$JWT" "$exp" "$ten" "$pol" >"$out"
    printf 200 ;;
  */v1/auth/token/lookup-self)
    grep -qx "X-Vault-Token: $JWT" "$hdr" || { echo '{}' >"$out"; printf 401; exit 0; }
    t=T1
    [ "$SCEN" = lookupwrong ] && t=T9
    printf '{"data":{"meta":{"tenant_id":"%s"},"ttl":3599}}' "$t" >"$out"
    printf 200 ;;
  *) printf 404 ;;
esac
STUB
cat >"$T/bin/kubectl" <<'STUB'
#!/bin/sh
echo "$*" >>"$T/argv"
while [ $# -gt 0 ]; do
  [ "$1" = --patch-file ] && cp "$2" "$T/patch.json"
  shift
done
[ "$SCEN" = kubefail ] && { echo 'Error from server (Forbidden): denied' >&2; exit 1; }
echo 'secret/workerra-vault-token patched'
STUB
printf '#!/bin/sh\nexit 0\n' >"$T/bin/sleep"
chmod +x "$T/bin/"*

# run <scenario> [VAR=value ...]: runs the script; sets $rc, output in $T/out.
run() {
  scen=$1
  shift
  rm -rf "$T/key" "$T/work" "$T/calls" "$T/argv" "$T/patch.json"
  mkdir -p "$T/key" "$T/work"
  printf '%s\n' "$API_KEY" >"$T/key/api_key"
  echo T1 >"$T/key/tenant_id"
  [ "$scen" = nokey ] && rm "$T/key/api_key"
  rc=0
  env PATH="$T/bin:$PATH" T="$T" SCEN="$scen" API_KEY="$API_KEY" JWT="$JWT" \
    VAULT_ADDR=https://vault.example NAMESPACE=int TARGET_SECRET=workerra-vault-token \
    EXPECTED_POLICIES=workerra-int-eso-read MAX_ATTEMPTS=3 KEY_DIR="$T/key" WORK="$T/work" \
    "$@" sh "$SCRIPT" >"$T/out" 2>&1 || rc=$?
}

# Checks every run: no secret in output or argv, work dir empty.
hygiene() {
  if grep -q -e "$API_KEY" -e "$JWT" -e TESTSECRET -e eyJ "$T/out"; then bad "$1: secret in output"; else ok "$1: no secret in output"; fi
  if [ -f "$T/argv" ] && grep -q -e "$API_KEY" -e "$JWT" "$T/argv"; then bad "$1: secret in argv"; else ok "$1: no secret in argv"; fi
  if [ -z "$(ls -A "$T/work")" ]; then ok "$1: work dir cleaned"; else bad "$1: files left: $(ls "$T/work")"; fi
}

expect_ok() {
  run "$@"
  if [ "$rc" -eq 0 ] && [ -f "$T/patch.json" ] &&
    jq -e --arg j "$JWT" '(.data.token | @base64d) == $j and .metadata.annotations["workerra.uk/token-expires-at"] != null' "$T/patch.json" >/dev/null; then
    ok "$1: token patched"
  else
    bad "$1: expected success (rc=$rc): $(tail -1 "$T/out")"
  fi
  hygiene "$1"
}

# expect_fail <scenario> <message substring> [VAR=value ...]
expect_fail() {
  scen=$1
  msg=$2
  shift 2
  run "$scen" "$@"
  if [ "$rc" -ne 0 ] && grep -q -- "$msg" "$T/out"; then ok "$scen: fails with '$msg'"; else bad "$scen: expected failure '$msg' (rc=$rc): $(tail -1 "$T/out")"; fi
  if [ -f "$T/patch.json" ] && [ "$scen" != kubefail ]; then bad "$scen: patched despite failing"; else ok "$scen: secret not written"; fi
  hygiene "$scen"
}

echo "== script"
expect_ok ok
expect_ok flaky
expect_ok trunc
expect_fail wrongtenant "belongs to tenant 'T2'"
expect_fail extrapol "policies are"
expect_fail extrapol "administrative policy" EXPECTED_POLICIES="admin,workerra-int-eso-read"
expect_fail mfa "requires MFA"
expect_fail notfound "HTTP 404 key_not_found"
expect_fail forbid "HTTP 403 no policy grants read"
expect_fail netdown "failed after 3 attempts"
expect_fail lookupwrong "lookup-self reports tenant 'T9'"
expect_fail shortlived "refusing to store it"
expect_fail badtoken "no well-formed token"
expect_fail kubefail "secret update failed"
expect_fail nokey "'api_key' is missing"
expect_fail ok "must be https://" VAULT_ADDR=http://vault.example

# ---- chart -----------------------------------------------------------------
echo "== chart"
command -v helm >/dev/null || { echo "helm not found" >&2; exit 1; }
render() { helm template workerra "$CHART" -n int --set image.tag=test "$@"; }

render -f "$CHART/values-int.yaml" >"$T/int.yaml"
# Pull a document out of the multi-doc render by kind + name.
doc() { awk -v k="kind: $1" -v n="  name: $2" 'BEGIN{RS="\n---\n"} index($0,k) && index($0,n) {print}' "$T/int.yaml"; }

cron=$(doc CronJob workerra-vault-token-refresh)
role=$(doc Role workerra-vault-token-refresh)
echo "$cron" | grep -q 'schedule: "\*/20 \* \* \* \*"' && ok "INT schedule is */20" || bad "INT schedule is not */20"
echo "$cron" | grep -Eq 'image: "alpine/k8s:1\.30\.2@sha256:[a-f0-9]{64}"' && ok "image pinned by digest" || bad "image not pinned by digest"
echo "$cron" | grep -q 'secretName: "workerra-vault-apikey"' && ok "mounts workerra-vault-apikey" || bad "API key Secret not mounted"
echo "$cron" | grep -q 'readOnlyRootFilesystem: true' && ok "read-only root fs" || bad "root fs writable"
echo "$role" | grep -q 'verbs: \["get", "patch"\]' && ok "Role verbs are get, patch" || bad "Role verbs changed: $(echo "$role" | grep verbs)"
echo "$role" | grep -q 'resourceNames: \["workerra-vault-token"\]' && ok "Role scoped to workerra-vault-token" || bad "Role not scoped by resourceNames"
[ "$(echo "$role" | grep -c 'resourceNames')" -eq 1 ] && ok "Role has a single rule" || bad "Role has extra rules"

if render | grep -q workerra-vault-token-refresh; then bad "base values render the refresher"; else ok "off by default"; fi
for v in "$CHART"/values-*.yaml; do
  case "$v" in */values-int.yaml) continue ;; esac
  if render -f "$v" | grep -q workerra-vault-token-refresh; then bad "$(basename "$v") enables the refresher"; else ok "$(basename "$v") leaves it off"; fi
done

guard() {
  label=$1
  want=$2
  shift 2
  if out=$(render -f "$CHART/values-int.yaml" "$@" 2>&1); then bad "guard '$label' did not fire"; else
    echo "$out" | grep -q -- "$want" && ok "guard: $label" || bad "guard '$label' wrong message: $out"
  fi
}
guard "needs ownVaultStore" "needs ownVaultStore.enabled" --set ownVaultStore.enabled=false
guard "expectedPolicies set" "expectedPolicies must list" --set 'ownVaultStore.tokenRefresh.expectedPolicies=null'
guard "https server" "must be an https:// URL" --set ownVaultStore.server=http://vault.example
guard "digest required" "digest must be a sha256" --set ownVaultStore.tokenRefresh.image.digest=
guard "distinct Secrets" "must differ" --set ownVaultStore.tokenRefresh.apiKeySecret=workerra-vault-token

echo
echo "$pass passed, $failures failed"
[ "$failures" -eq 0 ]
