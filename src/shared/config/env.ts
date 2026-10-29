import { ENVIRONMENTS, isAppEnv, type AppEnv } from "./environments";

// Server-side configuration. Read once per request path that needs it; never
// import from a client component — secrets here must not reach the browser.

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export interface ServerEnv {
  appEnv: AppEnv;
  siteUrl: string;
  logLevel: LogLevel;
  /** NebulaDB: LLM chat, embeddings and hybrid search used by the JobShout recruiting bot. */
  nebula: { url: string; apiKey: string | null } | null;
  /** OpsAPI: job listings (Workerra's plugin over the ATS) and, later, CRM leads. */
  opsapi: { url: string; namespace: string; apiKey: string } | null;
  /** JobShout agent platform (Career Agent). Phase 4; needs a service identity. */
  jobshoutApiUrl: string | null;
  /** Where the assistant tells people to email the recruitment team. Unset → no contact channel offered. */
  contactEmail: string | null;
  /** Show sample job listings (built-in, or marked as samples in OpsAPI). Always off in prod. */
  sampleJobs: boolean;
}

type Source = Record<string, string | undefined>;

export function loadServerEnv(source: Source = process.env): ServerEnv {
  const appEnv = source.APP_ENV ?? "local";
  if (!isAppEnv(appEnv)) {
    throw new Error(`APP_ENV must be one of local|int|test|acc|prod, got "${appEnv}"`);
  }

  const logLevel = source.LOG_LEVEL ?? (appEnv === "prod" ? "info" : "debug");
  if (!(LOG_LEVELS as readonly string[]).includes(logLevel)) {
    throw new Error(`LOG_LEVEL must be one of ${LOG_LEVELS.join("|")}, got "${logLevel}"`);
  }

  const defaultSiteUrl =
    appEnv === "local" ? `http://${ENVIRONMENTS.local.host}` : `https://${ENVIRONMENTS[appEnv].host}`;

  return {
    appEnv,
    siteUrl: stripTrailingSlash(source.SITE_URL || defaultSiteUrl),
    logLevel: logLevel as LogLevel,
    nebula: source.NEBULA_URL
      ? { url: stripTrailingSlash(source.NEBULA_URL), apiKey: source.NEBULA_API_KEY || null }
      : null,
    // CRM is all-or-nothing: a partial config would fail on the first lead.
    opsapi:
      source.OPSAPI_URL && source.OPSAPI_NAMESPACE && source.OPSAPI_API_KEY
        ? { url: stripTrailingSlash(source.OPSAPI_URL), namespace: source.OPSAPI_NAMESPACE, apiKey: source.OPSAPI_API_KEY }
        : null,
    jobshoutApiUrl: source.JOBSHOUT_API_URL ? stripTrailingSlash(source.JOBSHOUT_API_URL) : null,
    contactEmail: parseContactEmail(source.CONTACT_EMAIL),
    // Test data only: on by default locally, opt-in on int/test/acc, never on prod.
    sampleJobs: appEnv !== "prod" && (source.SAMPLE_JOBS ? source.SAMPLE_JOBS === "true" : appEnv === "local"),
  };
}

function parseContactEmail(value: string | undefined): string | null {
  const email = value?.trim();
  if (!email) return null;
  // Ends up in a mailto: link, so refuse anything that could add headers or a second address.
  if (!/^[^\s@,;?&]+@[^\s@,;?&]+\.[^\s@,;?&]+$/.test(email)) {
    throw new Error(`CONTACT_EMAIL must be a single email address, got "${email}"`);
  }
  return email;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
