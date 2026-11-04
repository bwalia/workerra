-- Local development only: run by docker-compose.opsapi.yml's `bootstrap` service
-- against its throwaway database. Never copied into an image (Dockerfile.migrations
-- ships project.lua, migrations/ and api/ only), never run against a shared OpsAPI.
--
-- Creates the `workerra` workspace with a recruiter account (its owner), and
-- prints an opsk_ API key scoped the way Workerra's server needs: search job
-- listings and send in applications. Recruiters post and manage jobs as
-- themselves, signed in, so the key needs nothing else.
--
-- The recruiter's email and password are passed in by the compose service from
-- WORKERRA_RECRUITER_EMAIL and WORKERRA_RECRUITER_PASSWORD (start.sh generates the
-- password into .env.local): `lapis exec` runs in a temporary server that doesn't
-- see the container's environment.
local cjson = require("cjson")
local db = require("lapis.db")

local opts = ...
local email = opts and opts.email
local password = opts and opts.password
assert(email and email:match("^[^@%s]+@[^@%s]+$"), "set WORKERRA_RECRUITER_EMAIL")
assert(password and #password >= 12, "set WORKERRA_RECRUITER_PASSWORD (12+ characters)")

require("scripts.setup-namespace").run({
    project_code = "all",
    namespace_name = "Workerra",
    namespace_slug = "workerra",
    admin_email = email,
    admin_password = password,
})

local ns = db.select("id FROM namespaces WHERE slug = ?", "workerra")[1]
assert(ns, "the workerra namespace wasn't created")

-- One server key at a time: revoke the ones earlier runs minted.
pcall(db.query, "DELETE FROM api_keys WHERE namespace_id = ? AND name = ?", ns.id, "workerra-local")

local ApiKey = require("helper.api-key")
local raw, prefix, hash = ApiKey.generate()
require("queries.ApiKeyQueries").create({
    namespace_id = ns.id,
    name = "workerra-local",
    key_prefix = prefix,
    key_hash = hash,
    scopes = cjson.encode({ workerra_jobs = { "read", "create" } }),
})

print("")
print("OPSAPI_NAMESPACE=workerra")
print("OPSAPI_API_KEY=" .. raw)
