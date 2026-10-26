# Implementation phases

Phase numbers match the `phase` field on each module descriptor
(`src/modules/*/index.ts`) and the "Planned · phase N" badge on placeholder pages.

| Phase | Scope | Modules |
|-------|-------|---------|
| **0 — Foundation** (done) | Next.js scaffold, module boundaries, placeholder routes, env/config, logging, API envelope, security headers, lint/typecheck/tests, docs | shared |
| **1 — Assistant + marketing** | Port the JobShout recruiting dock (UI + server turn logic) behind `/api/chat`; rate limiting; Langfuse tracing; real home, about, contact pages; blog content source decision | chatbot, marketing |
| **2 — Data, auth, jobs, candidates** | Choose and wire the database (Postgres, as JobShout) and migrations; auth provider; job listings, search, filters and detail pages; candidate registration, profile, CV upload, preferences | shared, jobs, candidates |
| **3 — Applications, recruiters, ATS** | Direct apply, Apply with LinkedIn, application tracking; recruiter/org accounts, job posting; pipeline stages and board | applications, recruitment, ats |
| **4 — AI matching + alerts** | Matching via JobShout agents/NebulaDB; explainable scores; AI-assisted applications via the Career Agent; saved-search and chatbot-created job alerts, email digests | matching, job-alerts, applications |
| **5 — Environments** | Dockerfile, Helm chart, image build, Ring Promoter app, INT/TEST/ACC VPN-only vhosts, PROD www — per [environments.md](environments.md) | infra |

Phase 5 can start any time after phase 1 if an INT ring is wanted early.

## Decisions needed

1. **Auth provider** — proposed: OpsAPI auth (the Workstation pattern; no shared
   SSO exists). Modules already depend only on `src/shared/auth`.
2. **Backend shape** — keep the API in Next.js route handlers (current plan; the
   heavy lifting happens in JobShout/NebulaDB) vs a separate service once
   recruiter workflows grow.
3. **Job inventory** — Workerra-owned jobs only, or also syndicated from the
   jobshout.com marketplace API.
4. **Blog source** — Markdown in repo vs a headless CMS.
5. **Repository visibility** — `bwalia/workerra` is currently **public**.
6. **Career Agent access** — needs a JobShout-side change (see chatbot-reference.md).
