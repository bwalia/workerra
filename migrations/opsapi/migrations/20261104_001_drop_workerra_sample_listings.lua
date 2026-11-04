-- Workerra no longer has sample (test) job listings: every listing is a real
-- vacancy a recruiter published. Removes the listing rows earlier local seeds
-- marked as samples, then the flag itself. The ATS jobs behind them are left
-- alone (ats_jobs belongs to OpsAPI); without a listing they aren't on Workerra.
return function(schema, db)
    db.query([[
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'workerra_job_listings' AND column_name = 'is_sample') THEN
                DELETE FROM workerra_job_listings WHERE is_sample;
                ALTER TABLE workerra_job_listings DROP COLUMN is_sample;
            END IF;
        END $$
    ]])
end
