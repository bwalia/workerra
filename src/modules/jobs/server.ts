import "server-only";
import { loadServerEnv } from "@/shared/config/env";
import { SAMPLE_JOBS } from "./sample-jobs";
import type { Job } from "./types";

// Server entry of the jobs module. Where listings come from is decided per
// request from the ring's runtime env (one image per ring), never at build time.

/** The jobs this ring can show, or null while it has no job source (prod today). */
export function listJobs(): readonly Job[] | null {
  return loadServerEnv().sampleJobs ? SAMPLE_JOBS : null;
}

export function findJob(id: string): Job | null {
  return listJobs()?.find((job) => job.id === id && job.status === "open") ?? null;
}
