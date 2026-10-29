-- Workerra job board API, mounted at /api/v2/workerra.
--
--   GET /jobs               search open, published jobs: ?q=&location=&sector=
--                           &workplace=a,b&type=a,b&include_samples=true&page=&per_page=
--   GET /jobs/sectors       open, published jobs per sector (same include_samples)
--   GET /jobs/:uuid         one open, published job by its ATS job uuid
--   PUT /jobs/:uuid/listing publish an ATS job on Workerra, or update its listing
--
-- A listed job is an ats_jobs row (title, location, employment type, description,
-- status) plus its workerra_job_listings row (everything else). Workerra's server
-- calls these with an opsk_ API key scoped to workerra_jobs.
local sdk = require("helper.plugin-sdk")
local cjson = require("cjson")
local db = sdk.db

local WORKPLACES = { onsite = true, hybrid = true, remote = true }
local EMPLOYMENT_TYPES = { full_time = true, part_time = true, contract = true, temporary = true, internship = true }
local SECTORS = {
    technology = true, healthcare = true, education = true, finance = true, logistics = true,
    customer_service = true, construction = true, marketing = true, hospitality_retail = true, admin = true,
}
local MAX_TERMS = 8

-- ATS employment types are free text ("Full-time", "full_time"): compare them in one form.
local EMPLOYMENT_SQL = "regexp_replace(lower(j.employment_type), '[^a-z]+', '_', 'g')"
local function employment_type(value)
    local t = type(value) == "string" and value:lower():gsub("[^a-z]+", "_") or nil
    return t and EMPLOYMENT_TYPES[t] and t or nil
end

local function str(v, max)
    if type(v) ~= "string" then return nil end
    v = v:gsub("^%s+", ""):gsub("%s+$", "")
    if v == "" then return nil end
    return v:sub(1, max or 200)
end

local function like(v)
    return "%" .. v:gsub("[%%_\\]", "\\%0") .. "%"
end

-- "remote,hybrid" (or repeated params) → whitelisted values, SQL-quoted.
local function list_of(param, allowed)
    local raw = type(param) == "table" and table.concat(param, ",") or param
    local out, seen = {}, {}
    for v in tostring(raw or ""):gmatch("[^,]+") do
        v = v:gsub("%s", "")
        if allowed[v] and not seen[v] then
            seen[v] = true
            out[#out + 1] = db.escape_literal(v)
        end
    end
    return out
end

local function json_list(v)
    if type(v) == "string" then v = cjson.decode(v) end
    return sdk.array(type(v) == "table" and v or {})
end

local function num(v)
    return v ~= nil and v ~= db.NULL and tonumber(v) or nil
end

local function date_only(v)
    return type(v) == "string" and v:sub(1, 10) or nil
end

local SELECT = [[
    SELECT j.uuid, j.title, j.location, j.description, j.status, ]] .. EMPLOYMENT_SQL .. [[ AS employment_type,
           l.company, l.workplace, l.sector, l.salary_min, l.salary_max, l.salary_currency, l.salary_period,
           l.responsibilities, l.requirements, l.benefits, l.skills, l.closes_at::text AS closes_at,
           l.is_sample, l.published_at::text AS published_at
    FROM workerra_job_listings l
    JOIN ats_jobs j ON j.id = l.ats_job_id AND j.namespace_id = l.namespace_id
]]

local function job_out(r)
    local min, max = num(r.salary_min), num(r.salary_max)
    local salary = cjson.null
    if min or max then
        salary = { min = min or cjson.null, max = max or cjson.null, currency = r.salary_currency,
            period = r.salary_period ~= db.NULL and r.salary_period or "year" }
    end
    return {
        uuid = r.uuid, title = r.title, company = r.company,
        location = r.location ~= db.NULL and r.location or "",
        workplace = r.workplace, employment_type = employment_type(r.employment_type) or cjson.null,
        sector = r.sector, salary = salary,
        description = r.description ~= db.NULL and r.description or "",
        responsibilities = json_list(r.responsibilities), requirements = json_list(r.requirements),
        benefits = json_list(r.benefits), skills = json_list(r.skills),
        posted_at = date_only(r.published_at), closes_at = date_only(r.closes_at) or cjson.null,
        sample = r.is_sample == true,
    }
end

-- WHERE clause for jobs a visitor may see, plus the search filters in `p`.
local function visible(ns, p)
    local where = {
        "l.namespace_id = " .. db.escape_literal(ns),
        "j.deleted_at IS NULL",
        "j.status = 'open'",
        EMPLOYMENT_SQL .. " IN ('full_time', 'part_time', 'contract', 'temporary', 'internship')",
    }
    if p.include_samples ~= "true" then where[#where + 1] = "NOT l.is_sample" end
    return where
end

local function search_where(ns, p)
    local where = visible(ns, p)
    -- Every keyword must appear in the title, company, description or skills.
    local terms = 0
    for term in tostring(str(p.q, 200) or ""):lower():gmatch("%S+") do
        terms = terms + 1
        if terms > MAX_TERMS then break end
        where[#where + 1] = "(j.title || ' ' || l.company || ' ' || COALESCE(j.description, '') || ' ' || l.skills::text) ILIKE "
            .. db.escape_literal(like(term:sub(1, 60)))
    end
    local location = str(p.location, 100)
    if location then where[#where + 1] = "j.location ILIKE " .. db.escape_literal(like(location)) end
    if p.sector and SECTORS[p.sector] then where[#where + 1] = "l.sector = " .. db.escape_literal(p.sector) end
    local workplaces = list_of(p.workplace, WORKPLACES)
    if #workplaces > 0 then where[#where + 1] = "l.workplace IN (" .. table.concat(workplaces, ", ") .. ")" end
    local types = list_of(p.type, EMPLOYMENT_TYPES)
    if #types > 0 then where[#where + 1] = EMPLOYMENT_SQL .. " IN (" .. table.concat(types, ", ") .. ")" end
    return table.concat(where, " AND ")
end

local function string_list(v, field, errors)
    if v == nil then return nil end
    if type(v) ~= "table" then
        errors[field] = "must be a list of strings"
        return nil
    end
    local out = {}
    for i, item in ipairs(v) do
        local s = str(item, 300)
        if not s then
            errors[field] = "item " .. i .. " must be a non-empty string"
            return nil
        end
        out[#out + 1] = s
    end
    if #out > 30 then errors[field] = "at most 30 items" end
    return cjson.encode(sdk.array(out))
end

local LISTING_FIELDS = {
    company = { type = "string", required = true, max = 200 },
    workplace = { type = "string", required = true, enum = { "onsite", "hybrid", "remote" } },
    sector = { type = "string", required = true, enum = {
        "technology", "healthcare", "education", "finance", "logistics", "customer_service", "construction",
        "marketing", "hospitality_retail", "admin" } },
    salary_min = { type = "number", min = 0 },
    salary_max = { type = "number", min = 0 },
    salary_currency = { type = "string", min = 3, max = 3 },
    salary_period = { type = "string", enum = { "hour", "day", "year" } },
    closes_at = { type = "date" },
    sample = { type = "boolean" },
}

return function(app)
    local function schema(name, s) return sdk.schema(app, name, s) end
    local S = { type = "string" }
    local STRINGS = { type = "array", items = S }

    local Salary = schema("Salary", {
        type = "object", required = { "currency", "period" },
        properties = { min = { type = "number" }, max = { type = "number" }, currency = S,
            period = { type = "string", enum = { "hour", "day", "year" } } },
    })
    local Job = schema("Job", {
        type = "object",
        required = { "uuid", "title", "company", "location", "workplace", "employment_type", "sector", "description",
            "responsibilities", "requirements", "benefits", "skills", "posted_at", "sample" },
        properties = {
            uuid = { type = "string", format = "uuid", description = "The ATS job's uuid" },
            title = S, company = S, location = S,
            workplace = { type = "string", enum = { "onsite", "hybrid", "remote" } },
            employment_type = { type = "string", enum = { "full_time", "part_time", "contract", "temporary", "internship" } },
            sector = { type = "string", enum = LISTING_FIELDS.sector.enum },
            salary = Salary, description = S,
            responsibilities = STRINGS, requirements = STRINGS, benefits = STRINGS, skills = STRINGS,
            posted_at = { type = "string", format = "date" },
            closes_at = { type = "string", format = "date" },
            sample = { type = "boolean", description = "Test data, not a real vacancy" },
        },
    })
    local SectorCount = schema("SectorCount", {
        type = "object", required = { "sector", "count" },
        properties = { sector = { type = "string", enum = LISTING_FIELDS.sector.enum }, count = { type = "integer" } },
    })
    local CSV = function(d) return { type = "string", description = d } end
    local INCLUDE_SAMPLES = { type = "string", enum = { "true", "false" }, description = "Include sample (test) listings" }

    sdk.doc(app, "GET /jobs", {
        summary = "Search open job listings, newest first", permission = "workerra_jobs.read",
        paginated = true, response = { type = "array", items = Job },
        query = {
            q = { type = "string", description = "Keywords; every one must appear in the title, company, description or skills" },
            location = { type = "string", description = "Part of the location, e.g. Leeds" },
            sector = { type = "string", enum = LISTING_FIELDS.sector.enum },
            workplace = CSV("Comma-separated: onsite, hybrid, remote"),
            type = CSV("Comma-separated: full_time, part_time, contract, temporary, internship"),
            include_samples = INCLUDE_SAMPLES,
        },
    })
    app:get("/jobs", sdk.handler({ permission = "workerra_jobs.read" }, function(self)
        local p = self.params
        local page, per_page, offset = sdk.page(p)
        local where = search_where(sdk.namespace_id(self), p)
        local total = db.query([[SELECT COUNT(*)::int AS n FROM workerra_job_listings l
            JOIN ats_jobs j ON j.id = l.ats_job_id AND j.namespace_id = l.namespace_id WHERE ]] .. where)[1].n
        local rows = db.query(SELECT .. " WHERE " .. where .. " ORDER BY l.published_at DESC, l.id DESC LIMIT "
            .. per_page .. " OFFSET " .. offset)
        local out = {}
        for i, r in ipairs(rows) do out[i] = job_out(r) end
        return sdk.ok(sdk.array(out), { page = page, per_page = per_page, total = total,
            total_pages = math.max(1, math.ceil(total / per_page)) })
    end))

    sdk.doc(app, "GET /jobs/sectors", {
        summary = "Open job listings per sector (sectors with none are left out)", permission = "workerra_jobs.read",
        response = { type = "array", items = SectorCount }, query = { include_samples = INCLUDE_SAMPLES },
    })
    app:get("/jobs/sectors", sdk.handler({ permission = "workerra_jobs.read" }, function(self)
        local where = table.concat(visible(sdk.namespace_id(self), self.params), " AND ")
        local rows = db.query([[SELECT l.sector, COUNT(*)::int AS count FROM workerra_job_listings l
            JOIN ats_jobs j ON j.id = l.ats_job_id AND j.namespace_id = l.namespace_id
            WHERE ]] .. where .. " GROUP BY l.sector ORDER BY l.sector")
        return sdk.ok(sdk.array(rows))
    end))

    sdk.doc(app, "GET /jobs/:uuid", {
        summary = "One open job listing", permission = "workerra_jobs.read",
        path = { uuid = { type = "string", format = "uuid" } }, query = { include_samples = INCLUDE_SAMPLES },
        response = Job, errors = { ["404"] = "Not listed (unknown, closed, unpublished or a hidden sample)" },
    })
    app:get("/jobs/:uuid", sdk.handler({ permission = "workerra_jobs.read" }, function(self)
        local where = visible(sdk.namespace_id(self), self.params)
        where[#where + 1] = "j.uuid = " .. db.escape_literal(tostring(self.params.uuid))
        local r = db.query(SELECT .. " WHERE " .. table.concat(where, " AND "))[1]
        if not r then return sdk.not_found("Job") end
        return sdk.ok(job_out(r))
    end))

    sdk.doc(app, "PUT /jobs/:uuid/listing", {
        summary = "Publish an ATS job on Workerra, or replace its listing details",
        description = "The job's title, location, description and status stay in the ATS. "
            .. "Its employment type must be one of full_time, part_time, contract, temporary, internship.",
        permission = "workerra_jobs.update", path = { uuid = { type = "string", format = "uuid" } },
        body = {
            type = "object", required = { "company", "workplace", "sector" },
            properties = {
                company = S, workplace = { type = "string", enum = { "onsite", "hybrid", "remote" } },
                sector = { type = "string", enum = LISTING_FIELDS.sector.enum },
                salary_min = { type = "number" }, salary_max = { type = "number" },
                salary_currency = { type = "string", description = "ISO 4217, default GBP" },
                salary_period = { type = "string", enum = { "hour", "day", "year" } },
                responsibilities = STRINGS, requirements = STRINGS, benefits = STRINGS, skills = STRINGS,
                closes_at = { type = "string", format = "date" },
                sample = { type = "boolean", description = "Mark as test data" },
            },
        },
        response = Job,
        errors = { ["404"] = "No such ATS job in this workspace", ["422"] = "Invalid listing details" },
    })
    app:put("/jobs/:uuid/listing", sdk.handler({ permission = "workerra_jobs.update" }, function(self)
        local ns = sdk.namespace_id(self)
        local body, err = sdk.body(self)
        if not body then return sdk.error(400, err) end
        local data, errors = sdk.validate(body, LISTING_FIELDS)
        errors = errors or {}
        local lists = {}
        for _, field in ipairs({ "responsibilities", "requirements", "benefits", "skills" }) do
            lists[field] = string_list(body[field], field, errors)
        end
        if data and data.salary_min and data.salary_max and data.salary_min > data.salary_max then
            errors.salary_max = "must be at least salary_min"
        end

        local job = db.select("id, employment_type FROM ats_jobs WHERE namespace_id = ? AND uuid = ? AND deleted_at IS NULL",
            ns, tostring(self.params.uuid))[1]
        if not job then return sdk.not_found("Job") end
        if not employment_type(job.employment_type) then
            errors.employment_type = "the ATS job's employment type must be one of full_time, part_time, contract, temporary, internship"
        end
        if not data or next(errors) then return sdk.error(422, "Validation failed", errors) end

        local row = {
            company = data.company, workplace = data.workplace, sector = data.sector,
            salary_min = data.salary_min or db.NULL, salary_max = data.salary_max or db.NULL,
            salary_currency = data.salary_currency and data.salary_currency:upper() or "GBP",
            salary_period = data.salary_period or db.NULL, closes_at = data.closes_at or db.NULL,
            is_sample = data.sample == true,
            responsibilities = lists.responsibilities or "[]", requirements = lists.requirements or "[]",
            benefits = lists.benefits or "[]", skills = lists.skills or "[]",
        }
        local existing = db.select("id FROM workerra_job_listings WHERE ats_job_id = ?", job.id)[1]
        if existing then
            row.updated_at = db.raw("NOW()")
            db.update("workerra_job_listings", row, { id = existing.id })
        else
            row.namespace_id = ns
            row.ats_job_id = job.id
            db.insert("workerra_job_listings", row)
        end

        -- Read back through the same query visitors use; a draft or closed ATS job is saved but not listed.
        local r = db.query(SELECT .. " WHERE l.ats_job_id = ?", job.id)[1]
        return sdk.ok(job_out(r))
    end))
end
