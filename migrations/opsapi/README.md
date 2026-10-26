# Workerra's OpsAPI plugin

Schema (and, later, custom endpoints) Workerra needs in OpsAPI's Postgres.
OpsAPI is a SaaS product we consume, so these files live **here**, never in the
OpsAPI repo. They run inside an OpsAPI container through its built-in plugin
runner (`helper/project-migrator.lua`), the same way
`bwalia/diy-tax-return-uk` ships `migrations/opsapi/`.

```
migrations/opsapi/
  project.lua                         manifest; code = "workerra"
  migrations/YYYYMMDD_NNN_name.lua    each returns function(schema, db)
  api/*.lua                           (later) routes, mounted at /api/v2/workerra/*
```

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
