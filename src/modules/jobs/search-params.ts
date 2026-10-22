import type { EmploymentType, JobSearchFilters, WorkplaceType } from "./types";

const WORKPLACE: readonly WorkplaceType[] = ["onsite", "hybrid", "remote"];
const EMPLOYMENT: readonly EmploymentType[] = ["full_time", "part_time", "contract", "temporary", "internship"];

type Params = Record<string, string | string[] | undefined>;

/** Normalises /jobs query params into filters, dropping unknown values. */
export function parseJobSearchParams(params: Params): JobSearchFilters {
  const page = Number.parseInt(first(params.page) ?? "1", 10);
  return {
    q: (first(params.q) ?? "").trim(),
    location: (first(params.location) ?? "").trim(),
    workplace: list(params.workplace).filter((v): v is WorkplaceType => WORKPLACE.includes(v as WorkplaceType)),
    employmentType: list(params.type).filter((v): v is EmploymentType => EMPLOYMENT.includes(v as EmploymentType)),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function list(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : value.split(",")).map((v) => v.trim()).filter(Boolean);
}
