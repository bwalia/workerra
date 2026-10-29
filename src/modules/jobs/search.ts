import type { EmploymentType, Job, JobSearchFilters, JobSearchResult, SalaryRange, WorkplaceType } from "./types";

export const JOBS_PAGE_SIZE = 10;

export const WORKPLACE_LABELS: Record<WorkplaceType, string> = { onsite: "On-site", hybrid: "Hybrid", remote: "Remote" };

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  temporary: "Temporary",
  internship: "Internship",
};

/**
 * Open jobs matching the /jobs filters, newest first. Every keyword must appear
 * in the title, company, skills or description; location is a substring match;
 * workplace and contract type match any of the chosen values.
 */
export function searchJobs(jobs: readonly Job[], filters: JobSearchFilters, pageSize = JOBS_PAGE_SIZE): JobSearchResult {
  const terms = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
  const location = filters.location.toLowerCase();

  const matches = jobs
    .filter((job) => job.status === "open")
    .filter((job) => {
      const text = [job.title, job.company, job.description, ...job.skills].join(" ").toLowerCase();
      return terms.every((term) => text.includes(term));
    })
    .filter((job) => !location || job.location.toLowerCase().includes(location))
    .filter((job) => !filters.workplace.length || filters.workplace.includes(job.workplace))
    .filter((job) => !filters.employmentType.length || filters.employmentType.includes(job.employmentType))
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));

  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  const page = Math.min(filters.page, pageCount);
  return { jobs: matches.slice((page - 1) * pageSize, page * pageSize), total: matches.length, page, pageCount };
}

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
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/jobs?${query}` : "/jobs";
}
