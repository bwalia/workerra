-- First Workerra migration: a small key/value table recording which plugin
-- schema is installed. Harmless on its own; it proves the consumer-migration
-- pipeline end to end before real tables (alerts, match results, consents) land.
return function(schema, db)
    db.query([[
        CREATE TABLE IF NOT EXISTS workerra_meta (
            key        VARCHAR(100) PRIMARY KEY,
            value      TEXT NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
    ]])
    db.query([[
        INSERT INTO workerra_meta (key, value)
        VALUES ('schema_owner', 'workerra')
        ON CONFLICT (key) DO NOTHING
    ]])
end
