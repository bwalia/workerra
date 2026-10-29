# Workerra's OpsAPI plugin

Schema and custom endpoints Workerra needs in OpsAPI.
OpsAPI is a SaaS product we consume, so these files live **here**, never in the
OpsAPI repo. They run inside an OpsAPI container through its built-in plugin
runner (`helper/project-migrator.lua`), the same way
`bwalia/diy-tax-return-uk` ships `migrations/opsapi/`.

```
migrations/opsapi/
  project.lua                         manifest; code = "workerra", RBAC module workerra_jobs
  migrations/YYYYMMDD_NNN_name.lua    each returns function(schema, db)
  api/jobs.lua                        job board routes, mounted at /api/v2/workerra/*
  dev/bootstrap.lua                   local stack only: workspace + API key (never shipped)
```

## Job listings

A job on Workerra is an OpsAPI **ATS job** (`ats_jobs`: title, location,
employment type, description, status) plus a **listing** row in
`workerra_job_listings` (company, pay, workplace, sector, responsibilities,
requirements, benefits, skills, closing date, sample flag). It's listed while it
has a listing and its ATS status is `open`. Listings marked as samples are only
returned with `include_samples=true`, which Workerra sends only where
`SAMPLE_JOBS` is on, so never on prod.

| Route | Permission | |
|---|---|---|
| `GET /api/v2/workerra/jobs` | `workerra_jobs.read` | Search: `q` (every word in title, company, description or skills), `location`, `sector`, `workplace`, `type` (comma-separated), `include_samples`, `page`, `per_page` |
| `GET /api/v2/workerra/jobs/sectors` | `workerra_jobs.read` | Open listings per sector |
| `GET /api/v2/workerra/jobs/:uuid` | `workerra_jobs.read` | One listing, by ATS job uuid |
| `PUT /api/v2/workerra/jobs/:uuid/listing` | `workerra_jobs.update` | Publish an ATS job, or replace its listing |

Workerra's server calls these through `@opsapi/client` (`src/modules/jobs/sources.ts`),
with types in `src/modules/jobs/opsapi-types.ts` that mirror the `sdk.doc`
descriptions in `api/jobs.lua`: change both together. The OpsAPI deployment that
serves Workerra must have the ATS feature on and the plugin installed
(`Dockerfile.migrations` copies `api/` as well as the migrations).

Applied migrations are tracked in OpsAPI's `project_migrations` table under
`project_code = 'workerra'`, separate from OpsAPI's own `lapis_migrations`.

## Run it locally

Needs Docker. Starts a throwaway Postgres, runs OpsAPI's own migrations with
every module enabled (as on INT, `PROJECT_CODE=all`), then Workerra's:

```bash
docker compose -f docker-compose.opsapi.yml up --build --abort-on-container-exit workerra-migrations
docker compose -f docker-compose.opsapi.yml run --rm psql -c "SELECT * FROM workerra_meta"
docker compose -f docker-compose.opsapi.yml down -v     # throw the database away
```

Re-running `up` is a no-op for migrations already applied.

### Search it from Workerra

The `server` profile adds an OpsAPI server with the plugin mounted (from the
working copy, reloading on save) on http://localhost:4041:

```bash
docker compose -f docker-compose.opsapi.yml --profile server up -d --build opsapi
docker compose -f docker-compose.opsapi.yml --profile server run --rm bootstrap   # prints OPSAPI_URL, _NAMESPACE, _API_KEY
OPSAPI_URL=http://localhost:4041 OPSAPI_NAMESPACE=workerra OPSAPI_API_KEY=opsk_… npm run seed:opsapi
```

Put the three values in `.env.local` and `/jobs` searches OpsAPI. The seed
publishes the sample listings through the ATS and plugin APIs, and skips any that
already exist. Each `bootstrap` run mints a new key; `down -v` throws everything away.

## Rules

- **Prefix every table with `workerra_`.**
- **Idempotent:** `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`,
  `CREATE INDEX IF NOT EXISTS`, seeds with `ON CONFLICT DO NOTHING`.
- **Never alter OpsAPI-owned tables:** `users`, `roles`, `user__roles`,
  `namespaces`, `namespace_*`, `user_namespace_settings`, `modules`,
  `role_permissions`, `lapis_migrations`, `project_migrations`, nor OpsAPI feature
  tables such as `ats_*` or `cms_*`. Reference them by id/uuid instead.
- **Every row that belongs to a tenant carries `namespace_id`.**
- **Filenames are immutable once merged:** the name is the tracking key, so a
  rename re-runs the migration everywhere. Fix forward with a new migration;
  there is no `down`.
