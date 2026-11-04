import { createClient, OpsApiError, type OpsApiClient } from "@opsapi/client";
import { noStoreFetch } from "@/shared/api";
import type { ApiApplicationInput, ApiJob, WorkerraJobPaths } from "./opsapi-types";
import { JOBS_PAGE_SIZE, SECTOR_LABELS } from "./search";
import type { Job, JobSearchFilters, JobSearchResult, JobSector } from "./types";

// Where /jobs gets its listings. server.ts picks one per request from the
// ring's runtime env; pages only ever see this interface.

export interface JobSource {
  search(filters: JobSearchFilters, pageSize?: number): Promise<JobSearchResult>;
  /** An open listing, or null when there's no such job (or it isn't listed). */
  find(id: string): Promise<Job | null>;
  /** Open listings per sector, with every sector present. */
  sectorCounts(): Promise<Record<JobSector, number>>;
  /** Send in an application for an open listing. */
  apply(id: string, application: ApiApplicationInput): Promise<ApplyResult>;
}

export type ApplyResult =
  | { status: "applied" }
  | { status: "duplicate" }
  | { status: "not_found" }
  | { status: "invalid"; errors: Record<string, string> };

export interface OpsApiJobSourceOptions {
  url: string;
  namespace: string;
  apiKey: string;
  /** For tests. */
  fetch?: typeof globalThis.fetch;
}

/**
 * Listings from OpsAPI: ATS jobs published through Workerra's plugin
 * (migrations/opsapi/api/jobs.lua). Searching, filtering and paging happen in
 * OpsAPI's Postgres, not here.
 */
export function opsApiJobSource(options: OpsApiJobSourceOptions): JobSource {
  const client: OpsApiClient<WorkerraJobPaths> = createClient<WorkerraJobPaths>({
    baseUrl: options.url,
    token: options.apiKey,
    namespace: options.namespace,
    // A page render waits on this: fail fast and show the "unavailable" state.
    timeoutMs: 5000,
    retries: 1,
    fetch: options.fetch ?? noStoreFetch,
  });

  const page = async (filters: JobSearchFilters, pageSize: number, page: number) => {
    const { data } = await client.GET("/api/v2/workerra/jobs", {
      params: {
        query: {
          ...(filters.q && { q: filters.q }),
          ...(filters.location && { location: filters.location }),
          ...(filters.sector && { sector: filters.sector }),
          ...(filters.workplace.length > 0 && { workplace: filters.workplace.join(",") }),
          ...(filters.employmentType.length > 0 && { type: filters.employmentType.join(",") }),
          page,
          per_page: pageSize,
        },
      },
    });
    return data!;
  };

  return {
    async search(filters, pageSize = JOBS_PAGE_SIZE) {
      let res = await page(filters, pageSize, filters.page);
      // Past the last page: show the last one, as the in-memory search does.
      if (res.data.length === 0 && res.meta.total > 0 && filters.page > res.meta.total_pages) {
        res = await page(filters, pageSize, res.meta.total_pages);
      }
      const jobs = res.data.map(fromApiJob).filter((job): job is Job => job !== null);
      return { jobs, total: res.meta.total, page: res.meta.page, pageCount: Math.max(1, res.meta.total_pages) };
    },

    async find(id) {
      // Ids are ATS job uuids; anything else can't exist there.
      if (!UUID.test(id)) return null;
      try {
        const { data } = await client.GET("/api/v2/workerra/jobs/{uuid}", { params: { path: { uuid: id } } });
        return fromApiJob(data!.data);
      } catch (err) {
        if (err instanceof OpsApiError && err.isNotFound) return null;
        throw err;
      }
    },

    async sectorCounts() {
      const { data } = await client.GET("/api/v2/workerra/jobs/sectors");
      const counts = Object.fromEntries(Object.keys(SECTOR_LABELS).map((s) => [s, 0])) as Record<JobSector, number>;
      for (const { sector, count } of data!.data) if (sector in counts) counts[sector] = count;
      return counts;
    },

    async apply(id, application) {
      if (!UUID.test(id)) return { status: "not_found" };
      try {
        await client.POST("/api/v2/workerra/jobs/{uuid}/applications", {
          params: { path: { uuid: id } },
          body: application,
        });
        return { status: "applied" };
      } catch (err) {
        if (err instanceof OpsApiError) {
          if (err.isNotFound) return { status: "not_found" };
          if (err.status === 409) return { status: "duplicate" };
          if (err.status === 422) return { status: "invalid", errors: detailsOf(err) };
        }
        throw err;
      }
    },
  };
}

/** The plugin's per-field validation messages ({ details: { field: message } }). */
export function detailsOf(err: OpsApiError): Record<string, string> {
  const details = (err.body as { details?: unknown } | undefined)?.details;
  if (!details || typeof details !== "object") return {};
  return Object.fromEntries(Object.entries(details).filter((e): e is [string, string] => typeof e[1] === "string"));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The plugin's listing as a Workerra Job, or null if it can't be shown (unknown employment type). */
export function fromApiJob(api: ApiJob): Job | null {
  if (!api.employment_type) return null;
  return {
    id: api.uuid,
    slug: api.uuid,
    title: api.title,
    company: api.company,
    location: api.location,
    workplace: api.workplace,
    employmentType: api.employment_type,
    sector: api.sector,
    salary: api.salary && {
      min: api.salary.min ?? null,
      max: api.salary.max ?? null,
      currency: api.salary.currency,
      period: api.salary.period,
    },
    description: api.description,
    ...(api.responsibilities.length > 0 && { responsibilities: api.responsibilities }),
    requirements: api.requirements,
    ...(api.benefits.length > 0 && { benefits: api.benefits }),
    skills: api.skills,
    postedAt: api.posted_at,
    closesAt: api.closes_at,
    status: "open",
  };
}
