# Workerra

AI-first jobs and recruitment platform for [workerra.uk](https://workerra.uk).
The chatbot is the main entry point: candidates and recruiters ask in plain
language and get routed to jobs, profiles, applications and alerts.

> **Status: phase 1 in progress.** The assistant on `/` and `/chat` answers with
> real AI through NebulaDB (the service behind JobShout's recruiting bot); set
> `NEBULA_URL` to enable it. Auth, database, job board, ATS, matching, alerts and
> blog CMS are **not built yet**, and the assistant says so rather than inventing listings.

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

## Modules

| Module | Route | Phase |
|--------|-------|-------|
| Chatbot (assistant) | `/` entry, `/chat` | 1 |
| Marketing website | `/about`, `/blog` | 1 |
| Jobs | `/jobs`, `/jobs/[jobId]` | 2 |
| Candidates | `/candidates` | 2 |
| Applications | `/applications` | 3 |
| Recruitment | `/recruiters` | 3 |
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
