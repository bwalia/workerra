import type { EmploymentType, JobSector, SalaryRange, WorkplaceType } from "./types";

// Types for Workerra's own OpsAPI endpoints (/api/v2/workerra/jobs*), for
// createClient<WorkerraJobPaths> from @opsapi/client. They mirror the sdk.doc
// descriptions in migrations/opsapi/api/jobs.lua: change both together. A server
// that serves /openapi.json can generate the same with openapi-typescript.

/** A listing as the plugin returns it: an ATS job plus its Workerra listing. */
export interface ApiJob {
  uuid: string;
  title: string;
  company: string;
  location: string;
  workplace: WorkplaceType;
  /** null when the ATS job's employment type isn't one Workerra knows. */
  employment_type: EmploymentType | null;
  sector: JobSector;
  salary: { min: number | null; max: number | null; currency: string; period: SalaryRange["period"] } | null;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  skills: string[];
  /** YYYY-MM-DD */
  posted_at: string;
  closes_at: string | null;
}

/** What POST /jobs/{uuid}/applications takes. */
export interface ApiApplicationInput {
  name: string;
  email: string;
  phone?: string;
  cover_letter?: string;
  /** Up to 5 http(s) links: CV, LinkedIn, portfolio. */
  links?: string[];
}

export interface ApiPageMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface ApiSectorCount {
  sector: JobSector;
  count: number;
}

export interface ApiJobSearchQuery {
  q?: string;
  location?: string;
  sector?: JobSector;
  /** Comma-separated WorkplaceType values. */
  workplace?: string;
  /** Comma-separated EmploymentType values. */
  type?: string;
  page?: number;
  per_page?: number;
}

type Json<T> = { headers: Record<string, unknown>; content: { "application/json": T } };
type ApiError = Json<{ success: false; error: string; details?: Record<string, string> }>;
type PathParams<Path> = [Path] extends [never] ? { path?: never } : { path: Path };
type Get<Query, Path, Data> = {
  parameters: { query?: Query; header?: never; cookie?: never } & PathParams<Path>;
  requestBody?: never;
  responses: { 200: Json<Data>; 401: ApiError; 403: ApiError; 404: ApiError };
};
type Post<Body, Path, Data> = {
  parameters: { query?: never; header?: never; cookie?: never } & PathParams<Path>;
  requestBody: { content: { "application/json": Body } };
  responses: { 201: Json<Data>; 401: ApiError; 403: ApiError; 404: ApiError; 409: ApiError; 422: ApiError };
};
type Route<Op, Path> = {
  parameters: { query?: never; header?: never; cookie?: never } & PathParams<Path>;
  get: Op;
  put?: never;
  post?: never;
  delete?: never;
  options?: never;
  head?: never;
  patch?: never;
  trace?: never;
};

type PostRoute<Op, Path> = Omit<Route<never, Path>, "get" | "post"> & { get?: never; post: Op };

export interface WorkerraJobPaths {
  "/api/v2/workerra/jobs": Route<
    Get<ApiJobSearchQuery, never, { success: true; data: ApiJob[]; meta: ApiPageMeta }>,
    never
  >;
  "/api/v2/workerra/jobs/sectors": Route<Get<never, never, { success: true; data: ApiSectorCount[] }>, never>;
  "/api/v2/workerra/jobs/{uuid}": Route<Get<never, { uuid: string }, { success: true; data: ApiJob }>, { uuid: string }>;
  "/api/v2/workerra/jobs/{uuid}/applications": PostRoute<
    Post<ApiApplicationInput, { uuid: string }, { success: true; data: { uuid: string; stage: string } }>,
    { uuid: string }
  >;
}
