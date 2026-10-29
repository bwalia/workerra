# Architecture

## Stack

Chosen to match JobShout's web apps (`jobshout/web/nextjs`, `jobshout-com/web/nextjs`)
so code and people move between them easily:

- Next.js 14.2 (App Router) + React 18, TypeScript `strict`
- Tailwind CSS 3
- ESLint 8 via `next lint` (`next/core-web-vitals`, `next/typescript`)
- Vitest for unit tests (JobShout's marketplace has none; the platform uses Playwright for e2e, which can be added in phase 2)
- No other runtime dependencies yet

Workerra is a single Next.js app. Route handlers under `src/app/api` are the
API layer (BFF). AI work, meaning the assistant, matching and the Career Agent, is
delegated to JobShout's existing services (NebulaDB, the JobShout agent platform).
Workerra does not run its own LLM framework. See [chatbot-reference.md](chatbot-reference.md).

## Layout

```
src/
  app/                    Routes only: thin pages that compose module exports
    page.tsx              Home + chatbot entry point
    chat/                 Assistant (placeholder)
    (marketing)/about, blog
    jobs/, jobs/[jobId]
    candidates/  applications/  alerts/
    recruiters/, recruiters/pipeline   (recruitment + ATS)
    api/health            Liveness probe
    api/chat              501 until the assistant is ported
    robots.ts             Ring-aware, evaluated per request
  modules/                One folder per business module
    <module>/index.ts     Public API: descriptor + exports. The ONLY import path.
    <module>/types.ts     Domain models (future DB entities)
    catalogue.ts          All descriptors, used for navigation, placeholders and tests
  shared/                 Cross-cutting foundation, no business logic
    api/                  { data } / { error } response envelope, notImplemented()
    auth/                 Session/Role contract; getSession() returns null for now
    config/               Ring table + server env parsing/validation
    logging/              Structured JSON logger with secret redaction
    security/             Static security headers
    ui/                   Container, ModulePlaceholder
    modules.ts            ModuleDescriptor type
```

## Module boundaries

- `src/app` holds routing and composition only. Logic lives in modules.
- Other code imports a module through `@/modules/<name>` (its `index.ts`).
  ESLint (`no-restricted-imports`) rejects deep imports such as `@/modules/jobs/types`.
- A module with server-side logic also exposes `@/modules/<name>/server`
  (`server/index.ts`, marked `import "server-only"`) for route handlers and server
  components. The client-safe `index.ts` never re-exports it.
- Modules may depend on `@/shared/*` and on other modules' public index. Current
  type-level dependencies: `candidates → jobs`, `job-alerts → jobs`.
- `shared/` never imports from `modules/`.
- Server-only code (`shared/config/env`, `shared/logging`) must not be imported
  from `"use client"` components.

| Module | Route | Owns |
|--------|-------|------|
| chatbot | `/chat` | Assistant UI + `/api/chat` proxy to JobShout AI services |
| marketing | `/about`, `/blog` | Landing pages, company info, blog |
| jobs | `/jobs` | Listings, search params/filters, job detail |
| candidates | `/candidates` | Registration, profile, CVs, preferences |
| applications | `/applications` | Direct / LinkedIn / AI-assisted apply, tracking |
| job-alerts | `/alerts` | Candidate-requested alerts and digests |
| matching | — (backend) | Match results from JobShout agents |
| recruitment | `/recruiters` | Recruiter/org accounts, job posting, review |
| ats | `/recruiters/pipeline` | Pipeline stages and history |

## Shared foundation: current state vs. plan

| Concern | Now | Planned |
|---------|-----|---------|
| Authentication | `Session`/`Role` types, `getSession()` → null, `hasRole()` | OpsAPI auth (`/auth/*`, `/api/v2/register`) via `@opsapi/client`, token in an httpOnly cookie; middleware guarding recruiter/candidate routes |
| API layer | Response envelope, health, 501 chat stub | Per-module route handlers, input validation, rate limiting |
| Database | Domain types per module (`types.ts`) | OpsAPI Postgres as system of record (ATS, CMS, CRM) + Workerra project plugin (below); NebulaDB for search/matching/chat only |
| Logging | JSON logs, level per ring, redaction | Request IDs; Langfuse for AI calls |
| Security | Static headers, no `X-Powered-By`, non-prod `robots.txt` disallow, secrets server-only | CSP with nonces, CSRF on mutations, rate limiting, PII handling for CVs |
| Testing | Vitest unit tests (config, logger, API, modules, routes exist) | Playwright e2e against INT |

## OpsAPI integration

OpsAPI is a SaaS product Workerra consumes; the OpsAPI repo is never changed
from here (only its SDK, `@opsapi/client`, when it lacks something). Pattern
taken from `bwalia/diy-tax-return-uk` `migrations/opsapi/`:

- **Calls:** `@opsapi/client` from server code only, with a `workerra` namespace
  and a module-scoped `opsk_` API key from WSL Vault.
- **Schema:** `migrations/opsapi/` in this repo (`project.lua` + `migrations/*.lua`,
  each `function(schema, db)`), tracked in OpsAPI's `project_migrations` under
  Workerra's project code. Tables start with `workerra_`; every migration is
  idempotent; OpsAPI-owned tables (users, roles, namespaces, modules, ...) are
  never altered.
- **Custom endpoints:** the same plugin's `api/*.lua`, mounted by OpsAPI's
  project loader under `/api/v2/workerra/*` (it refuses to replace core routes).
  Their types come from the server's `/openapi.json`.
- **Delivery:** an image `FROM bwalia/opsapi:<tag>` that copies the plugin to
  `/app/projects/workerra/` and runs `helper.project-migrator` as a Helm
  pre-upgrade hook after OpsAPI's own migrations.
- **Job listings (live):** `/jobs`, job pages and the home page's latest jobs
  search ATS jobs published through the plugin (`workerra_job_listings`,
  `GET /api/v2/workerra/jobs`), when `OPSAPI_*` is set. Filtering and paging run in
  OpsAPI's Postgres. Without OpsAPI the jobs module falls back to its built-in
  samples (non-prod) or says listings aren't live. See `migrations/opsapi/README.md`.
- **Known SDK gap:** `@opsapi/client` 1.3.0 has no ATS paths (generated against a
  server without the `ats` feature). Regenerate the SDK with `ats` enabled.

## Configuration

`src/shared/config/env.ts` parses and validates server env. It rejects an unknown
`APP_ENV` and enables integrations only when fully configured. Ring-specific
behaviour is decided at runtime because one image is promoted through every ring
(see [environments.md](environments.md)).
