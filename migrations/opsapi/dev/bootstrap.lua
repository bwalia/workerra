-- Local development only: run by docker-compose.opsapi.yml's `bootstrap` service
-- against its throwaway database. Never copied into an image (Dockerfile.migrations
-- ships project.lua, migrations/ and api/ only), never run against a shared OpsAPI.
--
-- Creates the `workerra` workspace and prints an opsk_ API key scoped the way
-- Workerra's server needs: read and publish job listings, and create ATS jobs
-- for scripts/seed-opsapi-jobs.ts.
local cjson = require("cjson")
local db = require("lapis.db")

require("scripts.setup-namespace").run({
    project_code = "all",
    namespace_name = "Workerra",
    namespace_slug = "workerra",
    admin_email = "admin@workerra.local",
    admin_password = "local-only-not-a-secret",
})

local ns = db.select("id FROM namespaces WHERE slug = ?", "workerra")[1]
assert(ns, "the workerra namespace wasn't created")

local ApiKey = require("helper.api-key")
local raw, prefix, hash = ApiKey.generate()
require("queries.ApiKeyQueries").create({
    namespace_id = ns.id,
    name = "workerra-local",
    key_prefix = prefix,
    key_hash = hash,
    scopes = cjson.encode({
        workerra_jobs = { "read", "update" },
        -- Core routes check the URL's module (/api/v2/ats/...) and then the RBAC module.
        ats = { "read", "create", "update" },
        ats_jobs = { "read", "create", "update" },
    }),
})

print("")
print("OPSAPI_URL=http://localhost:4041")
print("OPSAPI_NAMESPACE=workerra")
print("OPSAPI_API_KEY=" .. raw)
