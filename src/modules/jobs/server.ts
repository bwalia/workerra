import "server-only";
import { cache } from "react";
import { loadServerEnv } from "@/shared/config/env";
import { opsApiJobSource, type JobSource } from "./sources";

// Server entry of the jobs module. Listings are real vacancies recruiters
// published through OpsAPI (ATS jobs plus Workerra's plugin). Whether a ring has
// them is decided per request from its runtime env (one image per ring), never
// at build time: with no OPSAPI_* the pages say listings aren't live yet.

export type { ApplyResult, JobSource } from "./sources";
export { applyForJob, type ApplyFormState } from "./apply";

/** The listings this ring can search, or null while it has no job source. */
export function jobSource(): JobSource | null {
  const { opsapi } = loadServerEnv();
  return opsapi ? opsApiJobSource(opsapi) : null;
}

/**
 * One open listing, fetched once per request even though the page and its
 * metadata both ask. Throws when the source is unreachable.
 */
export const findJob = cache(async (id: string) => (await jobSource()?.find(id)) ?? null);
