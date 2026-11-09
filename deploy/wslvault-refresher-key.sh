#!/usr/bin/env bash
#
# wslvault-refresher-key.sh — create the machine key Workerra's wslvault token
# refresher uses (deploy/helm/workerra/templates/vault-token-refresh.yaml) and
# store it in the cluster, without ever printing it.
#
# Workerra's copy of wslvpn/deploy/scripts/wslvault-refresher-key.sh. The
# differences: Workerra's names; TENANT has no default (Workerra's repo
# carries no tenant ids) and is stored beside the key as `tenant_id`, which
# the refresher checks every run; and the new key must carry exactly POLICY.
#
#   TENANT=<Workerra-int-tenant id> bash deploy/wslvault-refresher-key.sh
#
# (Run it with bash. zsh's `read -p` means something else entirely.)
#
# The key must live in Workerra's tenant, carry only the read-only
# `workerra-read` policy, and not require MFA — nothing is there to type a code. wslvault
# decides the tenant from the credential that creates it:
#
#   - A signed-in key (wslv_...) mints only inside its OWN tenant, whatever the
#     request says, and needs the platform policy. A root or
#     platform key from another tenant silently creates the key over there.
#     This script refuses to try that.
#   - The bootstrap admin token (X-Admin-Token) may name any tenant.
#
# Whatever happens, the new key is checked before it is stored: it must sign
# in to TENANT, without MFA. If not, nothing is stored and its id is printed
# so it can be revoked.
set -euo pipefail

VAULT="${VAULT_ADDR:-https://vault.workstation.co.uk}"
TENANT="${TENANT:-}"
POLICY="${POLICY:-workerra-read}"
NAME="${NAME:-workerra-int-eso-refresher}"
NS="${NS:-int}"
SECRET="${SECRET:-workerra-vault-apikey}"
CRONJOB="${CRONJOB:-workerra-vault-token-refresh}"

if [ -z "$TENANT" ]; then
  read -r -p "Workerra tenant id (Workerra-int-tenant): " TENANT </dev/tty
fi
[[ "$TENANT" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]] || {
  echo "TENANT must be a tenant UUID" >&2; exit 1; }

command -v jq >/dev/null || { echo "jq required" >&2; exit 1; }
command -v kubectl >/dev/null || { echo "kubectl required" >&2; exit 1; }

if kubectl -n "$NS" get secret "$SECRET" >/dev/null 2>&1; then
  echo "secret $NS/$SECRET already exists; delete it first to replace it"; exit 0
fi

# post PATH JSON [HEADER] -> "<body>\n<status>". The body goes on stdin and the
# credential header through a curl config on a pipe (printf is a builtin), so
# neither is ever in a process's argv.
post() {
  printf '%s' "$2" | curl -s -m 20 -w '\n%{http_code}' -X POST \
    -K <(printf 'header = "%s"\n' "${3:-Accept: application/json}") \
    -H 'Content-Type: application/json' --data-binary @- "$VAULT$1"
}
# Wrap a secret as {"<field>": "<secret>"} from stdin, never argv.
as_json() { jq -Rsc --arg f "$1" '{($f): .}'; }
body() { sed '$d' <<<"$1"; }
status() { tail -1 <<<"$1"; }
# Describe a response without any secret-bearing field.
safe() { body "$1" | jq -c 'if type=="object" then del(.token, .key, .challenge, .api_key) else . end' 2>/dev/null || body "$1" | head -c 200; }

# Prompted without echo; WSLVAULT_ADMIN_CREDENTIAL / WSLVAULT_TOTP for CI.
CRED="${WSLVAULT_ADMIN_CREDENTIAL:-}"
if [ -z "$CRED" ]; then
  read -rs -p "admin credential (wslv_ admin key in the tenant, or the bootstrap admin token): " CRED </dev/tty; echo
fi
[ -n "$CRED" ] || { echo "nothing entered" >&2; exit 1; }

case "$CRED" in
  wslv_*)
    R=$(post /v1/auth/api-key "$(printf '%s' "$CRED" | as_json api_key)"); unset CRED
    [ "$(status "$R")" = 200 ] || { echo "sign-in failed: HTTP $(status "$R") $(safe "$R")" >&2; exit 1; }
    if [ "$(body "$R" | jq -r '.mfa_required // false')" = true ]; then
      CODE="${WSLVAULT_TOTP:-}"
      [ -n "$CODE" ] || read -r -p "authenticator code: " CODE </dev/tty
      R=$(post /v1/auth/mfa/totp "$(printf '%s\n%s' "$(body "$R" | jq -r .challenge)" "$CODE" | jq -Rsc 'split("\n") | {challenge: .[0], code: .[1]}')")
      [ "$(status "$R")" = 200 ] || { echo "code refused: HTTP $(status "$R") $(safe "$R")" >&2; exit 1; }
    fi
    signed_in=$(body "$R" | jq -r '.tenant_id // empty')
    echo "signed in: tenant ${signed_in:-?}, policies $(body "$R" | jq -c '.policies // []')"
    if [ "$signed_in" != "$TENANT" ]; then
      echo "::error::this key is in tenant ${signed_in:-?}; a signed-in key can only create keys in its own tenant." >&2
      echo "Use an admin key from tenant $TENANT, or the bootstrap admin token. Nothing was created." >&2
      exit 1
    fi
    AUTH="Authorization: Bearer $(body "$R" | jq -r .token)"; unset R
    ;;
  *)
    AUTH="X-Admin-Token: $CRED"; unset CRED
    ;;
esac

R=$(post /v1/api-keys "$(jq -nc --arg n "$NAME" --arg t "$TENANT" --arg p "$POLICY" \
  '{name:$n, tenant_id:$t, policies:[$p], mfa_required:false}')" "$AUTH"); unset AUTH
[ "$(status "$R")" = 200 ] || [ "$(status "$R")" = 201 ] || {
  echo "::error::key not created: HTTP $(status "$R") $(safe "$R")" >&2; exit 1; }
KEY=$(body "$R" | jq -r '.key // empty')
ID=$(body "$R" | jq -r '.id // empty'); unset R
case "$KEY" in wslv_*) ;; *) echo "::error::no key in the response" >&2; exit 1;; esac

# Check what was actually created before it goes anywhere.
C=$(post /v1/auth/api-key "$(printf '%s' "$KEY" | as_json api_key)")
got_tenant=$(body "$C" | jq -r '.tenant_id // empty')
got_mfa=$(body "$C" | jq -r '.mfa_required // false')
got_policies=$(body "$C" | jq -c '.policies // []'); unset C
if [ "$got_mfa" = true ] || [ "$got_tenant" != "$TENANT" ] || [ "$got_policies" != "[\"$POLICY\"]" ]; then
  unset KEY
  echo "::error::the new key signs in to tenant ${got_tenant:-?} with $got_policies (mfa_required=$got_mfa); expected $TENANT with [\"$POLICY\"], without MFA." >&2
  echo "Not stored. Revoke it: DELETE $VAULT/v1/api-keys/$ID" >&2
  exit 1
fi
echo "new key $ID signs in to tenant $got_tenant with $got_policies, no MFA"

printf %s "$KEY" | kubectl -n "$NS" create secret generic "$SECRET" \
  --from-file=api_key=/dev/stdin --from-literal=tenant_id="$TENANT"
unset KEY
echo "stored as $NS/$SECRET (api_key, tenant_id). Once the chart is deployed, run the refresher once:"
echo "  kubectl -n $NS create job --from=cronjob/$CRONJOB $CRONJOB-first"
echo "  kubectl -n $NS logs -f job/$CRONJOB-first"
