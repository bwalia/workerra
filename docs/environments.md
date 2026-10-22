# Environments and deployment plan

> **Status: plan only.** No DNS, VPN, edge, cluster or CI/CD deploy has been
> configured for Workerra. This document records the intended setup so it can be
> built in phase 5 (see [roadmap.md](roadmap.md)).

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

## Promotion model (proposed — mirrors JobShout)

1. Merge to `main` → CI builds one image `workerra/web:<vX.Y.Z>` → deployed to INT.
2. Ring Promoter (`rp.workstation.co.uk`) promotes INT → TEST → ACC when healthy.
3. ACC → PROD is **manual** (keep `auto_promote` off on ACC; JobShout learned this
   the hard way, see its `CLAUDE.md`).

Because **one image runs in every ring**, nothing ring-specific may be decided at
build time. The ring comes from the `APP_ENV` runtime variable; `robots.txt` and
`/api/health` read it per request. Don't use `NEXT_PUBLIC_*` for ring-specific
values — those are inlined at build time.

## VPN-only access for INT/TEST/ACC (proposed)

Follow the pattern JobShout uses for `int.jobshout.com` / `test.jobshout.com`
(`jobshout/jobshout-com/deploy/edge/README.md`):

- Cloudflare CNAME `<ring>.workerra.uk` → `lon1.pop0.uk`. DNS stays public so
  Let's Encrypt HTTP-01 keeps working.
- wslproxy vhost per ring with `"access_profile": "workerra-preprod"` — an
  allow-list of the VPN egress / LAN IPs; everyone else gets 403 "VPN required".
- Copy the access profile to pop0 **before** a vhost references it — a missing
  profile fails closed (every request 403s).
- PROD vhost `www.workerra.uk` has **no** access profile.

Open points to confirm before building it:
- Whether `workerra-preprod` can reuse the `jobshout-preprod` allow-list or needs
  its own (the home IP in that profile is residential and changes).
- Whether the `workerra.uk` zone is already in the Cloudflare account.
- Cluster/namespace (k3s1 like JobShout?) and Helm chart location.

## Secrets (proposed)

As in JobShout: real credentials in WSL Vault at `workerra/<ring>/<name>`,
materialised by External Secrets (`ClusterSecretStore wslvault-backend`). Never
bake secrets into the image or into Helm values. `.env.example` lists every
variable the app reads.

## Health

`GET /api/health` → `{"data":{"status":"ok","env":"<ring>","version":"<APP_VERSION>"}}`
for Kubernetes probes and the edge health check.
