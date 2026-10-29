-- Project manifest for Workerra, a consumer of OpsAPI.
--
-- Read by OpsAPI's helper/project-loader.lua and helper/project-migrator.lua
-- when this directory is mounted at /app/projects/workerra/ inside an OpsAPI
-- container (see Dockerfile.migrations). OpsAPI itself is never changed.
--
-- `code` keys every row this product writes to OpsAPI's `project_migrations`
-- table and sets the plugin's API prefix (/api/v2/workerra). It MUST stay
-- stable across releases. Do not rename it without a data migration.

return {
    code = "workerra",
    name = "Workerra",
    version = "0.1.0",
    description = "UK recruitment platform (consumer of OpsAPI)",
    enabled = true,

    -- Features this project relies on from core OpsAPI. `core` is always on;
    -- job listings extend the ATS's jobs (ats_jobs).
    depends = { "core", "ats" },

    -- RBAC modules this plugin registers. Workerra's server calls the plugin
    -- with an opsk_ API key scoped to these (e.g. workerra_jobs: ["read"]).
    modules = {
        { machine_name = "workerra_jobs", name = "Job listings", category = "Workerra" },
    },
}
