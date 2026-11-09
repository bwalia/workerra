#!/bin/sh
# Exchange Workerra's WSLVault machine API key for a fresh session token and
# write it to the Secret the workerra-vault SecretStore reads.
#
# The same flow, checks and messages as the shared refresher
# (wslvpn/deploy/environments/k3s1/wslvault-store.yaml). Differences: Workerra's
# names, and the expected tenant comes from the API key Secret's `tenant_id`
# key, because Workerra's public repo does not carry tenant ids.
#
# One attempt per run. A failure exits non-zero and the Job retries it
# (restartPolicy OnFailure, backoffLimit 3), as the shared refresher does.
#
# Env: VAULT_ADDR, NAMESPACE, TARGET_SECRET. Key dir (/key): api_key, tenant_id.
set -eu
: "${VAULT_ADDR:?}" "${NAMESPACE:?}" "${TARGET_SECRET:?}"
KEY_DIR=${KEY_DIR:-/key}
cd "${WORK:-/work}"
trap 'rm -f req.json resp.json patch.json' EXIT

[ -s "$KEY_DIR/api_key" ] || { echo "no api_key in the API key Secret" >&2; exit 1; }
EXPECTED_TENANT=$(tr -d ' \t\r\n' <"$KEY_DIR/tenant_id" 2>/dev/null || true)
[ -n "$EXPECTED_TENANT" ] || { echo "no tenant_id in the API key Secret" >&2; exit 1; }

# The key goes to curl from a file, never in argv.
jq -nc --rawfile k "$KEY_DIR/api_key" '{api_key: ($k | rtrimstr("\n"))}' > req.json
code=$(curl -sS --proto =https -o resp.json -w '%{http_code}' --connect-timeout 10 --max-time 30 \
  -X POST -H 'Content-Type: application/json' --data-binary @req.json \
  "$VAULT_ADDR/v1/auth/api-key")
rm -f req.json
if [ "$code" != 200 ]; then
  echo "api-key exchange failed: HTTP $code $(jq -c '.errors // .' resp.json 2>/dev/null)" >&2; exit 1
fi
if [ "$(jq -r '.mfa_required // false' resp.json)" = true ]; then
  echo "this key requires MFA; the refresher needs a machine key without it" >&2; exit 1
fi
tenant=$(jq -r '.tenant_id // empty' resp.json)
if [ "$tenant" != "$EXPECTED_TENANT" ]; then
  echo "key is in tenant '${tenant:-unknown}', expected $EXPECTED_TENANT; not updating" >&2; exit 1
fi
jq -e '.token | length > 0' resp.json >/dev/null || { echo "no token in response" >&2; exit 1; }
jq -c '{data: {token: (.token | @base64)}}' resp.json > patch.json
rm -f resp.json
kubectl -n "$NAMESPACE" patch secret "$TARGET_SECRET" --type merge --patch-file patch.json >/dev/null
rm -f patch.json
echo "refreshed workerra vault session for tenant $tenant"
