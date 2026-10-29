import Link from "next/link";
import { Container } from "@/shared/ui";
import { EMPLOYMENT_LABELS, WORKPLACE_LABELS, formatSalary, jobSearchQuery } from "../search";
import type { EmploymentType, Job, JobSearchFilters, JobSearchResult, WorkplaceType } from "../types";

// /jobs listings with keyword, location, workplace and contract-type filters.
// A plain GET form, so search works without client JavaScript and every result
// page is a shareable URL (the assistant links straight to them).

export function JobSearch({ filters, result }: { filters: JobSearchFilters; result: JobSearchResult }) {
  const hasSample = result.jobs.some((job) => job.sample);
  return (
    <Container className="py-12">
      <h1 className="text-3xl font-semibold text-slate-900">Jobs</h1>
      <p className="mt-2 text-slate-600">Search open roles by keyword, location, workplace and contract type.</p>

      <form action="/jobs" method="get" className="mt-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <label className="text-sm text-slate-700">
          Keywords
          <input name="q" defaultValue={filters.q} placeholder="e.g. React, nurse, accountant" className={INPUT} />
        </label>
        <label className="text-sm text-slate-700">
          Location
          <input name="location" defaultValue={filters.location} placeholder="e.g. Leeds" className={INPUT} />
        </label>
        <Checkboxes legend="Workplace" name="workplace" labels={WORKPLACE_LABELS} checked={filters.workplace} />
        <Checkboxes legend="Contract type" name="type" labels={EMPLOYMENT_LABELS} checked={filters.employmentType} />
        <div className="flex items-center gap-4 sm:col-span-2">
          <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Search jobs
          </button>
          <Link href="/jobs" className="text-sm text-slate-600 hover:text-slate-900">
            Clear filters
          </Link>
        </div>
      </form>

      {hasSample && (
        <p role="note" className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          These are sample listings for testing. They are not real vacancies.
        </p>
      )}

      <p className="mt-6 text-sm text-slate-500" aria-live="polite">
        {result.total === 1 ? "1 job" : `${result.total} jobs`}
      </p>
      {result.jobs.length ? (
        <ul className="mt-3 grid gap-3">
          {result.jobs.map((job) => (
            <li key={job.id}>
              <JobCard job={job} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-md border border-slate-200 bg-white px-4 py-6 text-slate-600">
          No jobs match these filters. Try fewer keywords or clear a filter.
        </p>
      )}

      {result.pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center gap-4 text-sm">
          {result.page > 1 && <Link href={jobSearchQuery(filters, result.page - 1)}>← Previous</Link>}
          <span className="text-slate-500">
            Page {result.page} of {result.pageCount}
          </span>
          {result.page < result.pageCount && <Link href={jobSearchQuery(filters, result.page + 1)}>Next →</Link>}
        </nav>
      )}
    </Container>
  );
}

const INPUT = "mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900";

function Checkboxes<T extends WorkplaceType | EmploymentType>({
  legend,
  name,
  labels,
  checked,
}: {
  legend: string;
  name: string;
  labels: Record<T, string>;
  checked: T[];
}) {
  return (
    <fieldset className="text-sm text-slate-700">
      <legend>{legend}</legend>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {(Object.entries(labels) as [T, string][]).map(([value, label]) => (
          <label key={value} className="flex items-center gap-1.5">
            <input type="checkbox" name={name} value={value} defaultChecked={checked.includes(value)} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function JobCard({ job }: { job: Job }) {
  const salary = formatSalary(job.salary);
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-500">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">
          <Link href={`/jobs/${job.id}`} className="hover:text-brand-700">
            {job.title}
          </Link>
        </h2>
        {job.sample && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">Sample</span>}
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {job.company} · {job.location}
      </p>
      <p className="mt-2 flex flex-wrap gap-x-3 text-sm text-slate-700">
        <span>{WORKPLACE_LABELS[job.workplace]}</span>
        <span>{EMPLOYMENT_LABELS[job.employmentType]}</span>
        {salary && <span>{salary}</span>}
      </p>
    </article>
  );
}
