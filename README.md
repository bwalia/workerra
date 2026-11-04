# Workerra

AI-first jobs and recruitment platform for [workerra.uk](https://workerra.uk).
The chatbot is the main entry point: candidates and recruiters ask in plain
language and get routed to jobs, profiles, applications and alerts.

> **Status.** The assistant on `/` and `/chat` answers with real AI through
> NebulaDB (the service behind JobShout's recruiting bot); set `NEBULA_URL` to
> enable it. With OpsAPI configured, the job board is live: recruiters sign in at
> `/recruiters`, post and close jobs and read applications; candidates search
> `/jobs` and apply from the job page without an account. There is no sample data:
> every listing is a real vacancy. Candidate profiles, application tracking, the
> pipeline board, matching, alerts and the blog CMS are **not built yet**.

## Quick start

Requires Node 20.18+ (`.nvmrc` pins 22).

```bash
cp .env.example .env.local
npm install
npm run dev            # http://localhost:3020
```

| Script | What it does |
|--------|--------------|
| `npm run dev` | Dev server on `$PORT` (default 3020, chosen to avoid JobShout's 3001/3010) |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint` (includes module-boundary rule) |
| `npm test` | Vitest unit tests |
| `npm run check` | typecheck + lint + test (run before pushing) |

### On Docker, reachable from your LAN

```bash
./start.sh                 # OpsAPI + next dev with hot reload, on http://<LAN IP>:3020
./start.sh --mode=prod     # the production Dockerfile image instead
./start.sh --no-opsapi     # the site alone (jobs, applying and recruiter sign-in off)
./start.sh --down          # stop (OpsAPI's database is kept)
./start.sh --reset-data    # stop and delete OpsAPI's database
```

`start.sh` runs OpsAPI with Workerra's plugin (`docker-compose.opsapi.yml`,
http://localhost:4041) next to the site. The first run creates the Workerra
workspace and a recruiter account and writes the API key, `SESSION_SECRET`, the
recruiter's password (`WORKERRA_RECRUITER_PASSWORD`) and the local sign-in code
(`OPSAPI_TEST_OTP_CODE`) into `.env.local`. The jobs board starts empty: sign in
at `/recruiters/sign-in` and post a job, then apply for it from `/jobs`.

It also detects this machine's LAN address (override with `--lan-ip=`), sets
`SITE_URL` to it and publishes the port on every interface, so phones and other
machines on the same network can open the site. Settings come from `.env.local`
(created from `.env.example` if missing); with no `NEBULA_URL` the assistant runs
in guided mode. `--port=` changes the host port, `--logs` follows the logs.

## Modules

| Module | Route | Phase |
|--------|-------|-------|
| Chatbot (assistant) | `/` entry, `/chat` | 1 |
| Marketing website | `/about`, `/blog` | 1 |
| Jobs (search, apply) | `/jobs`, `/jobs/[jobId]` | 2 |
| Candidates | `/candidates` | 2 |
| Applications | `/applications` | 3 |
| Recruitment (sign-in, post jobs, applications) | `/recruiters` | 3 |
| ATS | `/recruiters/pipeline` | 3 |
| AI matching | backend only | 4 |
| Job alerts | `/alerts` | 4 |

Each module lives in `src/modules/<name>/` and exposes its public API from
`index.ts`. Cross-cutting code (auth contract, API envelope, config, logging,
security headers, UI primitives) lives in `src/shared/`.

## Documentation

- [docs/architecture.md](docs/architecture.md): stack, layout, module boundaries, shared foundation
- [docs/chatbot-reference.md](docs/chatbot-reference.md): what to reuse from JobShout's AI bot
- [docs/environments.md](docs/environments.md): INT / TEST / ACC / PROD plan and VPN requirement
- [docs/roadmap.md](docs/roadmap.md): implementation phases and open decisions

## Environments

| Ring | URL | Access |
|------|-----|--------|
| INT | int.workerra.uk | Workstation VPN only |
| TEST | test.workerra.uk | Workstation VPN only |
| ACC | acc.workerra.uk | Workstation VPN only |
| PROD | www.workerra.uk | Public |

The INT pipeline (`.github/workflows/deploy-k3s.yml`: Cloudflare DNS → wslproxy
vhost → image → Ring Promoter → Helm) is written but needs one-off runner, secret
and Vault setup before its first run. See [docs/environments.md](docs/environments.md).

## Relationship to JobShout

Workerra is a separate product and repository. It reuses JobShout's AI services
(NebulaDB, the agent platform) over HTTP and ports UI patterns from jobshout.com.
It never imports from or modifies the JobShout repo.
