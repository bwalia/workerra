-- Job listings: what Workerra publishes about an OpsAPI ATS job.
--
-- The job itself (title, location, employment type, description, status) stays
-- in OpsAPI's ats_jobs, so the hiring pipeline and the public listing are the
-- same job. This table only adds what a job board needs on top: company, pay,
-- workplace, sector, the bullet lists and the closing date. A job is listed on
-- Workerra only while it has a row here and its ATS status is 'open'.
--
-- ats_jobs is referenced, never altered (migrations/opsapi/README.md).
return function(schema, db)
    db.query([[
        CREATE TABLE IF NOT EXISTS workerra_job_listings (
            id               BIGSERIAL PRIMARY KEY,
            uuid             TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
            namespace_id     BIGINT NOT NULL REFERENCES namespaces(id) ON DELETE CASCADE,
            ats_job_id       BIGINT NOT NULL UNIQUE REFERENCES ats_jobs(id) ON DELETE CASCADE,
            company          VARCHAR(200) NOT NULL,
            workplace        VARCHAR(16) NOT NULL CHECK (workplace IN ('onsite', 'hybrid', 'remote')),
            sector           VARCHAR(32) NOT NULL CHECK (sector IN ('technology', 'healthcare', 'education',
                               'finance', 'logistics', 'customer_service', 'construction', 'marketing',
                               'hospitality_retail', 'admin')),
            salary_min       NUMERIC(12, 2),
            salary_max       NUMERIC(12, 2),
            salary_currency  CHAR(3) NOT NULL DEFAULT 'GBP',
            salary_period    VARCHAR(8) CHECK (salary_period IN ('hour', 'day', 'year')),
            responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
            requirements     JSONB NOT NULL DEFAULT '[]'::jsonb,
            benefits         JSONB NOT NULL DEFAULT '[]'::jsonb,
            skills           JSONB NOT NULL DEFAULT '[]'::jsonb,
            closes_at        DATE,
            -- Test data: shown with a "Sample" label, and never on prod.
            is_sample        BOOLEAN NOT NULL DEFAULT FALSE,
            published_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max)
        )
    ]])
    db.query([[CREATE INDEX IF NOT EXISTS workerra_job_listings_ns_published_idx
        ON workerra_job_listings (namespace_id, published_at DESC)]])
    db.query([[CREATE INDEX IF NOT EXISTS workerra_job_listings_ns_sector_idx
        ON workerra_job_listings (namespace_id, sector)]])
end
