# Environments and deployment

> **Status:** the INT pipeline runs (`.github/workflows/deploy-k3s.yml`,
> `deploy/`) and its one-off setup below is done. TEST, ACC and PROD have no
> values file or edge spec yet, so the workflow refuses them.

## Rings

| Ring | Host | Access | Indexed | Purpose |
|------|------|--------|---------|---------|
| INT  | `int.workerra.uk`  | Workstation VPN only | no  | Every merge to `main`; integration |
| TEST | `test.workerra.uk` | Workstation VPN only | no  | QA / automated test runs |
| ACC  | `acc.workerra.uk`  | Workstation VPN only | no  | Acceptance / business sign-off |
| PROD | `www.workerra.uk`  | **Public**           | yes | Live site |

**Requirement:** only `www.workerra.uk` is reachable from the public internet.
INT, TEST and ACC must reject any request that does not come through the
Workstation VPN. The apex `workerra.uk` should redirect to `www`.

The same table lives in code at `src/shared/config/environments.ts` and a unit
test fails if any ring other than prod is marked public or indexable.

## Pipeline

Modelled on `bwalia/opsapi` and `bwalia/closeknitty` `deploy-k3s.yml`:

```
push to main ─▶ check ─▶ DNS ─▶ edge vhost ─▶ build & push harneetk78/workerra:<sha> ─▶ seed Ring Promoter (int)
                                                                                            │
Ring Promoter ◀─────────────────────────────────────────────────────────────────────────────┘
   └─ dispatches deploy-k3s.yml (TARGET_ENV=int, DEPLOYMENT_TYPE=deploy, IMAGE_TAG=<sha>)
        └─ DNS ─▶ edge vhost ─▶ helm upgrade workerra (namespace = ring) ─▶ RP checks /api/health data.version == <sha>
```

| Step | Where | What |
|------|-------|------|
| DNS | GitHub-hosted | Cloudflare CNAME `<host>` → `lon1.pop0.uk`, **DNS-only** (wslproxy terminates TLS and needs the real client IP). Refuses to replace a non-CNAME record. |
| Edge | self-hosted `workerra` | Registers `deploy/edge/wslproxy-server-<ring>.json` on the wslproxy admin API. Idempotent; fails if an existing vhost's `access_profile` differs from the spec. |
| Build | GitHub-hosted | `Dockerfile` (Next.js standalone, non-root), `linux/amd64`, tag = short SHA (+ `latest`). |
| Seed | GitHub-hosted | `POST rp.workstation.co.uk/api/apps/workerra/seed?async=1` for int and links the RP job. RP checks `/api/health` itself before recording the version. |
| Deploy | self-hosted `workerra` | Checks the tag exists on Docker Hub, `helm upgrade --install` (Helm pinned, no `--wait`) with `values-<ring>.yaml`, warns about unsynced ExternalSecrets, then `rollout status`, the running image and in-cluster `/api/health` version. |

The host for each ring is read from the `host:` line of
`deploy/helm/workerra/values-<ring>.yaml`, so DNS, edge and Ingress cannot drift.
The `ring` job refuses a non-prod ring whose edge spec has no `access_profile`.

Because **one image runs in every ring**, nothing ring-specific is decided at
build time. The chart sets `APP_ENV`, `SITE_URL` and `APP_VERSION` (the image
tag) per release. Don't use `NEXT_PUBLIC_*` for ring-specific values.

### Deploy switch (off by default)

The `dns`, `edge`, `build`, `seed` and `deploy` jobs only run when the repository
variable `WORKERRA_DEPLOY_ENABLED` is `true` (GitHub compares it
case-insensitively). Unset, empty or any other value means a push to `main`
(and any manual or Ring Promoter run) only runs `ring` and `check`, and touches
nothing outside the repo. `ci.yml` is not affected.

- Turn on, after the setup below: *Settings → Secrets and variables → Actions →
  Variables → New repository variable*, `WORKERRA_DEPLOY_ENABLED` = `true`.
- Turn off: delete the variable or set it to `false`. Runs already in progress
  are not stopped; cancel them in the Actions tab.

## One-off setup before the first INT deploy

All done for INT.

1. **Self-hosted runner** on `bwalia/workerra` with label `workerra`, on the
   operator LAN (it must reach the wslproxy admin API and the k3s API). Runners on
   a personal account are per repo, so the opsapi/closeknitty runners can't be reused.
   Before registering it, set *Settings → Actions → Fork pull request workflows*
   to **require approval for all external contributors** (currently
   `first_time_contributors`): the repo is public and `ci.yml` runs on PRs.
2. **Repository secrets** (CI credentials only):
   - `CLOUDFLARE_API_TOKEN`: Zone:Read + DNS:Edit on `workerra.uk`.
   - `WSLPROXY_USERNAME`, `WSLPROXY_PASSWORD`, `WSLPROXY_BASE_URL`.
   - `DOCKER_USERNAME`, `DOCKER_PASSWD`: push to the Docker Hub repository `harneetk78/workerra`
     (username `harneetk78` plus a Read & Write access token from that same account).
   - `RP_API_TOKEN`: workstation Ring Promoter API token.
   - `KUBE_CONFIG_DATA_K3S`: base64 kubeconfig for k3s1.
3. **Ring Promoter app** `workerra` in `bwalia/ring-promoter`
   `deploy/k8s/configmap.yaml` (github deployer → this workflow). `RP_GITHUB_TOKEN`
   must be allowed to dispatch workflows in `bwalia/workerra`.
4. **WSL Vault** path `workerra/<ring>/core`, written in the tenant whose token
   `wslvault-backend` uses. Create or top it up with
   `VAULT_TOKEN=... deploy/vault-seed.sh <ring>` (idempotent, prints key names only):
   - `SESSION_SECRET`: generated once, never replaced on re-runs (recruiter sign-in).
   - `CONTACT_EMAIL`: pass `CONTACT_EMAIL=...` to the script. One plain address:
     anything else fails `/api/health`.
   - Other keys are kept. Int's NebulaDB needs no `NEBULA_API_KEY`. Don't add
     `OPSAPI_API_KEY` until a Workerra OpsAPI with the plugin exists (PR #10):
     with all three `OPSAPI_*` set, `/jobs` uses only OpsAPI.

   Key names equal env var names. Without the path the pod still starts (the
   Secret is optional) and the deploy only warns. The ESO token's policy must
   allow reading `workerra/*`. INT's path exists (`SESSION_SECRET`; no
   `CONTACT_EMAIL` yet).

## Workerra OpsAPI backend

> **Status: off everywhere.** `opsapi.enabled` is `false` in the chart and in
> `values-int.yaml`, and the deploy switch above is off too. Nothing below has been done.

Workerra runs its **own** OpsAPI for job listings, the same way CloseKnitty runs
`closeknitty-opsapi`. The shared Workstation OpsAPI (`workstation-opsapi`) is not
used and must not be changed for Workerra.

| Piece | What | Where |
|---|---|---|
| Image | `bwalia/opsapi:<OPSAPI_BASE_TAG>` + the plugin (`migrations/opsapi/`) | `Dockerfile.opsapi` → `harneetk78/workerra-opsapi:<sha>`, built by `deploy-k3s.yml` with the web image |
| OpsAPI | `workerra-opsapi` Deployment + ClusterIP Service, one replica | `templates/opsapi.yaml` |
| Setup | initContainer on every start: `lapis migrate` (`PROJECT_CODE=core_only,ats`), the `workerra` workspace, the plugin's migrations. All idempotent | `templates/opsapi.yaml` |
| Database | `workerra-opsapi-postgres` StatefulSet (pgvector, `local-path` 10Gi) | `templates/opsapi-postgres.yaml` |
| Access | No Ingress. NetworkPolicies admit only the Workerra web pods to OpsAPI, and only OpsAPI to Postgres | `templates/opsapi.yaml` |
| Web app | `OPSAPI_URL` (in-cluster) and `OPSAPI_NAMESPACE` set automatically when enabled; `OPSAPI_API_KEY` from `workerra/<ring>/core` | `templates/deployment.yaml` |

### Turning it on for INT (each step needs Balinder's approval)

1. **Pipeline prerequisites:** the one-off setup above is done and
   `WORKERRA_DEPLOY_ENABLED=true`. The first build pushes `harneetk78/workerra-opsapi`
   (Docker Hub creates the public repo on first push; the image holds no secrets).
2. **OpsAPI's own secrets** at WSL Vault `workerra/int/opsapi`: `POSTGRES_PASSWORD`,
   `JWT_SECRET_KEY`, `OPENSSL_SECRET_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, all
   newly generated for this backend, never copied from another OpsAPI. Check the
   ESO token's policy can read `workerra/*`.
3. **Enable:** set `opsapi.enabled: true` in `values-int.yaml`, merge, and let
   Ring Promoter deploy. The `setup` initContainer migrates and creates the
   workspace. Postgres pins itself to the node it first lands on.
4. **API key for the web app:** an `opsk_` key in the `workerra` workspace scoped
   to `workerra_jobs: ["read", "create"]` only (search and apply, as
   `migrations/opsapi/dev/bootstrap.lua` mints locally). The backend has no SMTP, so mint it inside the
   pod (the same calls as `migrations/opsapi/dev/bootstrap.lua`) rather than through
   a dashboard sign-in. It prints once; put it straight into Vault as
   `OPSAPI_API_KEY` at `workerra/int/core`, never into a terminal log or chat:

   ```bash
   kubectl -n int exec deploy/workerra-opsapi -c opsapi -- lapis exec "
     local ns = require('lapis.db').select('id FROM namespaces WHERE slug = ?', 'workerra')[1]
     local raw, prefix, hash = require('helper.api-key').generate()
     require('queries.ApiKeyQueries').create({ namespace_id = ns.id, name = 'workerra-web',
       key_prefix = prefix, key_hash = hash, scopes = require('cjson').encode({ workerra_jobs = { 'read', 'create' } }) })
     print(raw)"
   ```

   ESO syncs it within a minute; then restart the web pods
   (`kubectl -n int rollout restart deploy/workerra`). Until the key is there the
   jobs pages say listings aren't live yet. Revoke a key from the OpsAPI dashboard
   (port-forward `svc/workerra-opsapi`) or `ApiKeyQueries.revoke`.
5. **Listings:** there is no sample data. Create a recruiter account in the
   `workerra` workspace (as `dev/bootstrap.lua` does locally); recruiters then sign
   in at `/recruiters/sign-in` (needs `SESSION_SECRET` at `workerra/int/core`) and
   post real listings.

TEST, ACC and PROD repeat this with their own values file, Vault paths and keys.
PROD's secrets go in the prod-only Vault tenant, and its key is minted there,
never copied from a non-prod ring.

**Upgrading OpsAPI:** bump `OPSAPI_BASE_TAG` in `deploy-k3s.yml` (it must ship the
ATS feature) and check the plugin with `docker-compose.opsapi.yml` first.

## VPN-only access for INT/TEST/ACC

Same pattern as `int.jobshout.com` / `int.closeknitty.com`
(`jobshout/jobshout-com/deploy/edge/README.md`, `wslproxy/docs/VPN_ACCESS.md`):

- The vhost carries `"access_profile": "jobshout-preprod"`, which already exists
  on pop0. wslproxy expands it into allow (VPN/LAN egress CIDR) / deny (403
  "VPN required") rules. A missing profile fails **closed**.
- `/.well-known/acme-challenge/` is served before any rule, so DNS stays public
  and Let's Encrypt keeps working.
- Known limits, inherited from that profile: the allowed IP is the home
  residential IP (changes occasionally), it admits the whole home LAN as well as
  WireGuard peers, and the origin port-forward must be restricted to pop0 or the
  profile can be bypassed.
- A Workerra-specific `workerra-preprod` profile can replace it later. Copy it to
  pop0 **before** any vhost references it.
- JobShout keeps ACC public. Workerra's ACC must get its own vhost with the
  profile attached.

Verify from **outside** the VPN (e.g. a phone on mobile data) that
`https://int.workerra.uk` returns the 403 page before calling INT done.

## Secrets

Real credentials live in WSL Vault (`https://vault.workstation.co.uk`, KV v2
mount `kv`) at `workerra/<ring>/<purpose>`, materialised by External Secrets
(`ClusterSecretStore wslvault-backend`, `deploy/helm/workerra/templates/vault-secrets.yaml`).
Never bake secrets into the image or Helm values. `.env.example` lists every
variable the app reads.

A Vault change reaches the pods without a deploy: ESO refreshes the Secret every
minute and Stakater Reloader (`reloader.stakater.com/auto`) rolls the Deployment.
Reloader ignores a Secret's first creation, so after creating a new path either
redeploy the ring from Ring Promoter or `kubectl -n <ring> rollout restart deploy/workerra`.

**Workerra's own tenant.** With `ownVaultStore.enabled` (on in `values-int.yaml`)
the chart creates a namespaced `SecretStore workerra-vault` and every Workerra
ExternalSecret reads through it instead of `wslvault-backend`. INT reads the
`Workerra-int-tenant` tenant. WSLVault keeps each tenant's `kv` separate: a
write made with a credential from another tenant succeeds and is invisible
here, at the identical path.

**Token refresh.** External Secrets can only use a pre-issued WSLVault JWT
(WSLVault has no approle/kubernetes login), and an API key yields a JWT that
lasts one hour. So, exactly like the shared refresher
(`wslvpn/deploy/environments/k3s1/wslvault-store.yaml`), CronJob
`workerra-vault-token-refresh` (`ownVaultStore.tokenRefresh`, on in
`values-int.yaml`) trades a machine API key for a fresh token every 30 minutes
and patches it into `workerra-vault-token`. It uses the same image, RBAC (get and
patch on that one Secret), pod security, Job retries and checks as the shared
refresher. The differences:

- Workerra's names.
- The expected tenant id is read from the API key Secret (`tenant_id`),
  because this public repo carries no tenant ids.

If the refresh stops, the store fails within the hour, but the Secrets it
already synced are kept, so running pods are unaffected.

**Who can read the machine key.** Only the refresher CronJob *uses*
`int/workerra-vault-apikey` (mounted read-only, mode 0440; its Role can only
`get`/`patch` `workerra-vault-token`). It is **not** exclusive to the refresher:
`int` is a shared ring namespace, so every identity that can read or mount
Secrets there can reach it, exactly as with every other INT Secret (`workerra-core`
and the shared-tenant Vault token included). As reviewed on 2026-11-09
(read-only, `kubectl auth can-i --as`):

- read any `int` Secret: cluster-admin (`system:masters`, `helm-traefik`,
  `headlamp`, `longhorn-support-bundle`), Ring Promoter's `ring-exec/ring-deploy-job`
  and `rp-deploy-workstation-shop`, Argo CD, External Secrets, Reloader,
  sealed-secrets, kubepilot, the postgres operator, the Traefik and wslproxy
  ingress controllers, `intellaro-ingress`, `prod/obs-grafana`, `prod/obs-loki`,
  `acc/spectoncr-grafana`, and JobShout's `int/jobshout-secretsrot` Role (no
  `resourceNames`);
- create pods or Deployments in `int`, and so mount it: cluster-admin, `headlamp`,
  `ring-deploy-job`, Argo CD's application controller (pods and Deployments),
  `rp-deploy-workstation-shop` and the postgres operator (Deployments).

The ring = namespace convention and other applications' RBAC are left as they
are. What limits a leaked key is the key itself: `workerra-read` only (read
`secret/data/workerra/int/**`), Workerra's own tenant, no MFA, never superuser
(the key script checks the new token's claims before storing it). WSLVault's
lease endpoints don't check policy, so a leaked key could also sign out other
sessions in Workerra-int-tenant (not other tenants). Recovery: delete
`int/workerra-vault-apikey`, revoke the key (`DELETE /v1/api-keys/<id>` with the
bootstrap admin token), mint a new one with the script, and rotate
`workerra/int/*`.

| What | Value |
|---|---|
| Vault path (KV v2 mount `kv`) | `workerra/int/core` → `GET /v1/kv/data/workerra/int/core` |
| Policy resource WSLVault checks | `secret/data/workerra/int/core` (action `read`) |
| Machine key policy | `workerra-read`: `{"paths":["secret/data/workerra/int/**"],"capabilities":["read"]}` |
| API key Secret | `int/workerra-vault-apikey`: `api_key`, `tenant_id` |
| Token Secret | `int/workerra-vault-token`: `token` |

**Keys at `workerra/int/core`** (the pod loads them with `envFrom`; see `src/shared/config/env.ts`):

| Key | INT | Notes |
|---|---|---|
| `SESSION_SECRET` | required | At least 32 characters; recruiter sign-in. `deploy/vault-seed.sh` generates one if missing and never replaces a valid one. |
| `CONTACT_EMAIL` | required | One email address. Anything else makes the app's config check throw. |
| `NEBULA_API_KEY` | only if INT's NebulaDB sets `NEBULA_API_KEYS` | Not set today. |
| `OPSAPI_API_KEY` | only once OpsAPI is on for INT | Set by the OpsAPI setup, not now. |

Everything else is not a Vault key:

- `APP_ENV`, `APP_VERSION`, `SITE_URL`, `PORT`, and `OPSAPI_URL`/`OPSAPI_NAMESPACE` come from the chart.
- `NEBULA_URL` and `LOG_LEVEL` come from `extraEnv` in `values-int.yaml`.
- `WORKERRA_RECRUITER_*` and `OPSAPI_TEST_OTP_CODE` are local only.
- `JOBSHOUT_API_URL` is not used yet.

### Initial setup (once per ring)

Everything runs in a terminal on your Mac. `curl` talks to the WSLVault API and
`kubectl` talks to k3s1. Nothing runs inside WSLVault. The only thing done in the
WSLVault console is getting your admin key, if you don't already have it.

0. **Sign in to the tenant** (tenant admin key, which holds the tenant's `admin`
   policy). Use bash, and keep the same terminal for steps 1–2: the token
   lasts an hour.

   Credentials are typed at hidden prompts and reach `curl` on stdin or through
   a `-K` config on a pipe (`printf` is a bash builtin), never on a command
   line, where any local user could read them in the process list.

   ```bash
   export KUBECONFIG=~/.kube/k3s1.yaml VAULT_ADDR=https://vault.workstation.co.uk
   vh() { printf 'header = "X-Vault-Token: %s"\n' "$VAULT_TOKEN"; }          # Vault token header
   bh() { printf 'header = "Authorization: Bearer %s"\n' "$VAULT_TOKEN"; }   # same token, policy API
   read -rs -p "Workerra-int-tenant admin key (wslv_...): " K; echo
   R=$(printf '%s' "$K" | jq -Rsc '{api_key: .}' | curl -fsS -X POST "$VAULT_ADDR/v1/auth/api-key" \
     -H 'Content-Type: application/json' --data-binary @-); unset K
   echo "$R" | jq '{mfa_required, tenant_id, policies}'
   # If mfa_required is true:
   #   read -r -p "code: " C
   #   R=$({ echo "$R"; printf '%s' "$C" | jq -Rs .; } | jq -sc '{challenge: .[0].challenge, code: .[1]}' | curl -fsS -X POST \
   #     "$VAULT_ADDR/v1/auth/mfa/totp" -H 'Content-Type: application/json' --data-binary @-); unset C
   export VAULT_TOKEN=$(echo "$R" | jq -r .token); unset R
   TENANT=$(curl -fsS "$VAULT_ADDR/v1/auth/token/lookup-self" -K <(vh) | jq -r .data.meta.tenant_id)
   echo "tenant: $TENANT"   # must be Workerra-int-tenant's id
   ```

1. **Write the INT keys** with the existing seed script. It merges, keeps every
   key already there, and prints key names only:

   ```bash
   read -r -p "CONTACT_EMAIL: " CONTACT_EMAIL; export CONTACT_EMAIL
   deploy/vault-seed.sh int
   curl -fsS "$VAULT_ADDR/v1/kv/data/workerra/int/core" -K <(vh) | jq '.data.data | keys'
   ```

2. **Create the read-only policy** (needs the tenant's `admin` or `root` policy,
   which step 0's key has). WSLVault keys policies by (tenant, name) and takes
   the tenant from the caller's token, so this only ever touches
   Workerra-int-tenant. `PUT` silently replaces an existing policy, so look
   first: create it only if it is missing, and stop if a `workerra-read` with
   other rules is already there. Then read it back: a failed database write
   can still answer 200.

   ```bash
   WANT='{"name":"workerra-read","rules":[{"paths":["secret/data/workerra/int/**"],"capabilities":["read"]}]}'
   code=$(curl -sS -o /tmp/workerra-read.json -w '%{http_code}' "$VAULT_ADDR/v1/policies/workerra-read" -K <(bh))
   case "$code" in
     404) printf '%s' "$WANT" | curl -fsS -X PUT "$VAULT_ADDR/v1/policies/workerra-read" -K <(bh) \
            -H 'Content-Type: application/json' --data-binary @- >/dev/null && echo created ;;
     200) jq -e --argjson w "$WANT" '.rules == $w.rules' /tmp/workerra-read.json >/dev/null \
            && echo "already there, same rules" || echo "STOP: workerra-read exists with other rules" ;;
     *) echo "STOP: HTTP $code" ;;
   esac
   sleep 6   # every policy-engine replica reloads from the database within ~5s
   curl -fsS "$VAULT_ADDR/v1/policies/workerra-read" -K <(bh) 2>/dev/null \
     | jq -e --argjson w "$WANT" '.rules == $w.rules' >/dev/null 2>&1 \
     && echo "workerra-read verified" || echo "STOP: workerra-read is missing or has other rules"
   rm -f /tmp/workerra-read.json
   unset VAULT_TOKEN
   ```

   `secret/data/workerra/int/**` matches every path under `workerra/int/`
   (`core`, `opsapi`, deeper ones) and `workerra/int` itself, and nothing in
   `workerra/test`, `workerra/int-*` or any other tenant. `read` allows only GET
   of secret data: no write, delete, list, metadata, policy or key management.

3. **Make sure the token Secret exists.** The refresher can only patch it. It
   exists on INT already; this creates it, empty, only if it is missing:

   ```bash
   kubectl -n int get secret workerra-vault-token >/dev/null 2>&1 \
     || kubectl -n int create secret generic workerra-vault-token --from-literal=token=
   ```

4. **Mint the machine key and store it** with `deploy/wslvault-refresher-key.sh`
   (Workerra's copy of wslvpn's script). WSLVault creates a key in the tenant of
   whoever signs in, and a tenant's own `admin` policy cannot mint keys at all,
   so this needs the **bootstrap admin token** (`X-Admin-Token`), as for wslvpn.
   The script:
   - mints `workerra-read`, without MFA, in `$TENANT`;
   - signs in with the new key and checks its tenant, exact policies, MFA and,
     from the new token's claims (decoded locally, never printed), that it is
     not a superuser, before storing anything; on any mismatch it stores
     nothing and prints only the key id to revoke;
   - stores it as `int/workerra-vault-apikey` (`api_key`, `tenant_id`) without
     printing it.

   ```bash
   WSLVAULT_ADMIN_CREDENTIAL=$(kubectl -n wslvault get secret wslvault-mesh-keys -o jsonpath='{.data.admin-token}' | base64 -d) \
     TENANT="$TENANT" bash deploy/wslvault-refresher-key.sh
   ```

5. **Check, without printing values:**

   ```bash
   kubectl -n int get secret workerra-vault-apikey -o json | jq '.data | keys'   # ["api_key","tenant_id"]
   kubectl -n int get secret workerra-vault-token -o json | jq '.data | keys'    # ["token"]
   ```

6. After the chart with the refresher is deployed, run it once and check the store:

   ```bash
   kubectl -n int create job --from=cronjob/workerra-vault-token-refresh workerra-vault-token-refresh-first
   kubectl -n int logs -f job/workerra-vault-token-refresh-first   # "refreshed workerra vault session for tenant …"
   kubectl -n int get secretstore workerra-vault                    # Ready
   kubectl -n int get externalsecret workerra-core                  # SecretSynced
   kubectl -n int delete job workerra-vault-token-refresh-first
   ```

   `workerra-core` is not new, so Reloader rolls the pods when its keys change.

### Recovery

- **Store not Ready:** read the last run (`kubectl -n int logs job/<latest
  workerra-vault-token-refresh-…>`), fix the cause, then run step 6.
- **`api-key exchange failed: HTTP 404 key_not_found`:** the key was revoked
  or lost. Delete `int/workerra-vault-apikey`, revoke the old key
  (`DELETE /v1/api-keys/<id>`, with the bootstrap token) and run step 4 again.
  The script refuses to overwrite an existing Secret.
- **`key is in tenant …`, `requires MFA`:** the stored key is not this ring's
  machine key. Replace it as above.
- **Pause:** `kubectl -n int patch cronjob workerra-vault-token-refresh -p
  '{"spec":{"suspend":true}}'` (until the next deploy), or set
  `ownVaultStore.tokenRefresh.suspend=true`.

PROD secrets go in a **separate prod-only WSL Vault tenant**: the project tenant
kind accepts INT/TEST/ACC only (`wslvault/docs/operations/secret-tags-and-environments.md`).
Promoting to PROD means copying each secret into that tenant, not reusing a
non-prod value.

## Promotion

ACC → PROD stays manual: register the app with `acc: {auto_promote: false}` (Ring
Promoter refuses `true` on acc). PROD needs explicit approval, plus a
`values-prod.yaml`, an edge spec **without** an access profile, the apex redirect
and the prod Vault tenant.

## Health

`GET /api/health` → `{"data":{"status":"ok","env":"<ring>","version":"<APP_VERSION>"}}`
for Kubernetes probes and Ring Promoter (`health_version_field: data.version`).
