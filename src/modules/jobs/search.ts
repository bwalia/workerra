import type { EmploymentType, JobSearchFilters, JobSector, SalaryRange, WorkplaceType } from "./types";

export const JOBS_PAGE_SIZE = 10;

export const WORKPLACE_LABELS: Record<WorkplaceType, string> = { onsite: "On-site", hybrid: "Hybrid", remote: "Remote" };

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  temporary: "Temporary",
  internship: "Internship",
};

export const SECTOR_LABELS: Record<JobSector, string> = {
  technology: "Technology and IT",
  healthcare: "Healthcare and nursing",
  education: "Education and teaching",
  finance: "Accounting and finance",
  logistics: "Warehouse and logistics",
  customer_service: "Customer service",
  construction: "Construction and trades",
  marketing: "Marketing and creative",
  hospitality_retail: "Hospitality and retail",
  admin: "Office and administration",
};

/** "£60,000–£72,000 a year", "£13.50 an hour", or null when no pay is given. */
export function formatSalary(salary: SalaryRange | null): string | null {
  if (!salary || (salary.min === null && salary.max === null)) return null;
  const money = (n: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: salary.currency,
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    }).format(n);
  const per = { hour: "an hour", day: "a day", year: "a year" }[salary.period];
  const { min, max } = salary;
  if (min !== null && max !== null) return `${min === max ? money(min) : `${money(min)}–${money(max)}`} ${per}`;
  return min !== null ? `From ${money(min)} ${per}` : `Up to ${money(max as number)} ${per}`;
}

/** Same filters as a /jobs query string, for pagination links. */
export function jobSearchQuery(filters: JobSearchFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.location) params.set("location", filters.location);
  if (filters.workplace.length) params.set("workplace", filters.workplace.join(","));
  if (filters.employmentType.length) params.set("type", filters.employmentType.join(","));
  if (filters.sector) params.set("sector", filters.sector);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/jobs?${query}` : "/jobs";
}

/** Whether any filter beyond the page number is set. */
export function hasFilters(filters: JobSearchFilters): boolean {
  return Boolean(filters.q || filters.location || filters.workplace.length || filters.employmentType.length || filters.sector);
}
