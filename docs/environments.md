# Environments and deployment

> **Status:** the INT pipeline is written (`.github/workflows/deploy-k3s.yml`,
> `deploy/`) but has **not run yet**. It needs the one-off setup below. TEST, ACC
> and PROD have no values file or edge spec yet, so the workflow refuses them.

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
push to main ─▶ check ─▶ DNS ─▶ edge vhost ─▶ build & push bwalia/workerra:<sha> ─▶ seed Ring Promoter (int)
                                                                                         │
Ring Promoter ◀──────────────────────────────────────────────────────────────────────────┘
   └─ dispatches deploy-k3s.yml (TARGET_ENV=int, DEPLOYMENT_TYPE=deploy, IMAGE_TAG=<sha>)
        └─ DNS ─▶ edge vhost ─▶ helm upgrade workerra (namespace = ring) ─▶ RP checks /api/health data.version == <sha>
```

| Step | Where | What |
|------|-------|------|
| DNS | GitHub-hosted | Cloudflare CNAME `<host>` → `lon1.pop0.uk`, **DNS-only** (wslproxy terminates TLS and needs the real client IP). Refuses to replace a non-CNAME record. |
| Edge | self-hosted `workerra` | Registers `deploy/edge/wslproxy-server-<ring>.json` on the wslproxy admin API. Idempotent; fails if an existing vhost's `access_profile` differs from the spec. |
| Build | GitHub-hosted | `Dockerfile` (Next.js standalone, non-root), `linux/amd64`, tag = short SHA (+ `latest`). |
| Seed | GitHub-hosted | `POST rp.workstation.co.uk/api/apps/workerra/seed` for int, then waits until int reports the tag healthy. |
| Deploy | self-hosted `workerra` | Checks the tag exists on Docker Hub, `helm upgrade --install --wait` with `values-<ring>.yaml`. |

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

None of this is done yet.

1. **Self-hosted runner** on `bwalia/workerra` with label `workerra`, on the
   operator LAN (it must reach the wslproxy admin API and the k3s API). Runners on
   a personal account are per repo, so the opsapi/closeknitty runners can't be reused.
   Before registering it, set *Settings → Actions → Fork pull request workflows*
   to **require approval for all external contributors** (currently
   `first_time_contributors`): the repo is public and `ci.yml` runs on PRs.
2. **Repository secrets** (CI credentials only):
   - `CLOUDFLARE_API_TOKEN`: Zone:Read + DNS:Edit on `workerra.uk`.
   - `WSLPROXY_USERNAME`, `WSLPROXY_PASSWORD`, `WSLPROXY_BASE_URL`.
   - `DOCKER_USERNAME`, `DOCKER_PASSWD`: push to `bwalia/workerra`.
   - `RP_API_TOKEN`: workstation Ring Promoter API token.
   - `KUBE_CONFIG_DATA_K3S`: base64 kubeconfig for k3s1.
3. **Ring Promoter app** `workerra` in `bwalia/ring-promoter`
   `deploy/k8s/configmap.yaml` (github deployer → this workflow). `RP_GITHUB_TOKEN`
   must be allowed to dispatch workflows in `bwalia/workerra`.
4. **WSL Vault** path `workerra/int/core` with the app's secrets (`NEBULA_API_KEY`,
   later `OPSAPI_API_KEY`, ...). Key names equal env var names. Until it exists,
   the pod still starts (the Secret is optional) and the assistant reports offline.
   The ESO token's policy must allow reading `workerra/*`.

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
