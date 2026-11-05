import type { EmploymentType, JobSector, SalaryRange, WorkplaceType } from "@/modules/jobs";

// The OpsAPI endpoints a signed-in recruiter uses, for createClient<RecruiterPaths>.
// The ATS routes are OpsAPI's own (lapis/routes/ats.lua; @opsapi/client doesn't
// type them yet); the /workerra ones are this repo's plugin
// (migrations/opsapi/api/jobs.lua): change both together.

export type AtsJobStatus = "draft" | "open" | "paused" | "closed";

export interface AtsJobInput {
  title: string;
  location: string;
  employment_type: EmploymentType;
  description: string;
  status: AtsJobStatus;
}

export interface ListingInput {
  company: string;
  workplace: WorkplaceType;
  sector: JobSector;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_period?: SalaryRange["period"];
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  skills: string[];
  closes_at?: string;
}

/** One of the workspace's listings, whatever its ATS status. */
export interface ApiListing {
  uuid: string;
  title: string;
  company: string;
  location: string;
  status: AtsJobStatus;
  /** Visitors can see and apply for it now (open and not past its closing date). */
  listed: boolean;
  applications: number;
  posted_at: string;
  closes_at: string | null;
}

export interface ApiApplication {
  uuid: string;
  stage: string;
  name: string;
  email: string;
  phone: string | null;
  links: string[];
  cover_letter: string | null;
  applied_at: string;
}

type Json<T> = { headers: Record<string, unknown>; content: { "application/json": T } };
type ApiError = Json<{ success: false; error: string; details?: Record<string, string> }>;
type Errors = { 400: ApiError; 401: ApiError; 403: ApiError; 404: ApiError; 422: ApiError };
type PathParams<Path> = [Path] extends [never] ? { path?: never } : { path: Path };
type Params<Query, Path> = { query?: Query; header?: never; cookie?: never } & PathParams<Path>;
type Envelope<Data> = { success: true; data: Data };
type Op<Query, Path, Body, Data> = {
  parameters: Params<Query, Path>;
  responses: { 200: Json<Data>; 201: Json<Data> } & Errors;
} & ([Body] extends [never] ? { requestBody?: never } : { requestBody: { content: { "application/json": Body } } });
type Unused = {
  get?: never;
  put?: never;
  post?: never;
  delete?: never;
  options?: never;
  head?: never;
  patch?: never;
  trace?: never;
};
type Path<P, Ops> = Omit<Unused, keyof Ops> & Ops & { parameters: Params<never, P> };
type Page = { page: number; per_page: number; total: number; total_pages: number };

export interface RecruiterPaths {
  "/api/v2/ats/jobs": Path<never, { post: Op<never, never, AtsJobInput, Envelope<{ uuid: string; status: AtsJobStatus }>> }>;
  "/api/v2/ats/jobs/{uuid}": Path<
    { uuid: string },
    { put: Op<never, { uuid: string }, Partial<AtsJobInput>, Envelope<{ uuid: string; status: AtsJobStatus }>> }
  >;
  "/api/v2/workerra/jobs/{uuid}/listing": Path<
    { uuid: string },
    { put: Op<never, { uuid: string }, ListingInput, Envelope<{ uuid: string }>> }
  >;
  "/api/v2/workerra/listings": Path<
    never,
    { get: Op<{ page?: number; per_page?: number }, never, never, Envelope<ApiListing[]> & { meta: Page }> }
  >;
  "/api/v2/workerra/listings/{uuid}": Path<{ uuid: string }, { get: Op<never, { uuid: string }, never, Envelope<ApiListing>> }>;
  "/api/v2/workerra/listings/{uuid}/applications": Path<
    { uuid: string },
    { get: Op<never, { uuid: string }, never, Envelope<ApiApplication[]>> }
  >;
}
