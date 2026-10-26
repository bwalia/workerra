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
  /** OpsAPI CRM, where the assistant records candidate and recruiter leads. */
  opsapi: { url: string; namespace: string; apiKey: string } | null;
  /** JobShout agent platform (Career Agent). Phase 4; needs a service identity. */
  jobshoutApiUrl: string | null;
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
  };
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
