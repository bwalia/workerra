import "server-only";
import { cache } from "react";
import { loadServerEnv } from "@/shared/config/env";
import { opsApiJobSource, sampleJobSource, type JobSource } from "./sources";

// Server entry of the jobs module. Where listings come from is decided per
// request from the ring's runtime env (one image per ring), never at build time:
//
//   OPSAPI_* set   → OpsAPI: ATS jobs published through Workerra's plugin.
//                    Listings marked as samples are included where SAMPLE_JOBS is on.
//   otherwise      → the built-in sample listings where SAMPLE_JOBS is on,
//                    else none (the page says listings aren't live yet).

export type { JobSource } from "./sources";

/** The listings this ring can search, or null while it has no job source. */
export function jobSource(): JobSource | null {
  const env = loadServerEnv();
  if (env.opsapi) return opsApiJobSource({ ...env.opsapi, includeSamples: env.sampleJobs });
  return env.sampleJobs ? sampleJobSource() : null;
}

/**
 * One open listing, fetched once per request even though the page and its
 * metadata both ask. Throws when the source is unreachable.
 */
export const findJob = cache(async (id: string) => (await jobSource()?.find(id)) ?? null);
