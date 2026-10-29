import Link from "next/link";
import { chatHref } from "@/modules/chatbot";
import { Container } from "@/shared/ui";
import { EMPLOYMENT_LABELS, SECTOR_LABELS, WORKPLACE_LABELS, hasFilters, jobSearchQuery } from "../search";
import type { EmploymentType, JobSearchFilters, JobSearchResult, JobSector, WorkplaceType } from "../types";
import { JobCard, SampleNotice } from "./JobCard";
import { JobCategories, JobSearchTips, JobsFaq } from "./JobsGuide";

// /jobs listings with keyword, location, sector, workplace and contract-type filters.
// A plain GET form, so search works without client JavaScript and every result
// page is a shareable URL (the assistant links straight to them).

export function JobSearch({
  filters,
  result,
  sectorCounts,
}: {
  filters: JobSearchFilters;
  result: JobSearchResult;
  sectorCounts: Record<JobSector, number>;
}) {
  const hasSample = result.jobs.some((job) => job.sample);
  const filtered = hasFilters(filters);
  return (
    <Container className="py-12">
      <JobsIntro />

      <form action="/jobs" method="get" className="mt-6 grid gap-4 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm text-body">
          Keywords
          <input name="q" defaultValue={filters.q} placeholder="Job title, skill or qualification" className={INPUT} />
        </label>
        <label className="text-sm text-body">
          Location
          <input name="location" defaultValue={filters.location} placeholder="Town or city, e.g. Leeds" className={INPUT} />
        </label>
        <label className="text-sm text-body sm:col-span-2 lg:col-span-1">
          Sector
          <select name="sector" defaultValue={filters.sector ?? ""} className={INPUT}>
            <option value="">All sectors</option>
            {(Object.entries(SECTOR_LABELS) as [JobSector, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Checkboxes legend="Workplace" name="workplace" labels={WORKPLACE_LABELS} checked={filters.workplace} />
        <div className="lg:col-span-2">
          <Checkboxes legend="Contract type" name="type" labels={EMPLOYMENT_LABELS} checked={filters.employmentType} />
        </div>
        <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-3">
          <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Search jobs
          </button>
          {filtered && (
            <Link href="/jobs" className="text-sm text-muted hover:text-ink">
              Clear filters
            </Link>
          )}
        </div>
      </form>

      {hasSample && (
        <div className="mt-6">
          <SampleNotice>
            These are sample listings for testing Workerra. The employers are made up and these are not real vacancies.
          </SampleNotice>
        </div>
      )}

      <p className="mt-6 text-sm text-muted" aria-live="polite">
        {result.total === 1 ? "1 job" : `${result.total} jobs`}
        {filtered ? (result.total === 1 ? " matches your search" : " match your search") : result.total > 0 ? ", newest first" : ""}
      </p>
      {result.jobs.length ? (
        <ul className="mt-3 grid gap-3">
          {result.jobs.map((job) => (
            <li key={job.id}>
              <JobCard job={job} />
            </li>
          ))}
        </ul>
      ) : filtered ? (
        <NoMatches filters={filters} />
      ) : (
        <div className="mt-3 rounded-lg border border-line bg-surface px-5 py-6">
          <h2 className="text-lg font-semibold text-ink">There are no open jobs right now</h2>
          <p className="mt-2 max-w-2xl text-body">
            New roles are added as employers publish them. In the meantime, the assistant can help you work out what to
            look for and get your CV ready.
          </p>
          <Link href={chatHref("Help me work out what jobs suit me")} className={`mt-5 inline-block ${SECONDARY}`}>
            Ask the assistant
          </Link>
        </div>
      )}

      {result.pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center gap-4 text-sm">
          {result.page > 1 && <Link href={jobSearchQuery(filters, result.page - 1)}>← Previous</Link>}
          <span className="text-muted">
            Page {result.page} of {result.pageCount}
          </span>
          {result.page < result.pageCount && <Link href={jobSearchQuery(filters, result.page + 1)}>Next →</Link>}
        </nav>
      )}

      <div className="mt-16 space-y-16">
        <JobCategories counts={sectorCounts} current={filters.sector} />
        <JobSearchTips />
        <JobsFaq />
      </div>
    </Container>
  );
}

/**
 * /jobs without results to show: a ring with no job source yet ("not_live"),
 * or one whose source couldn't be reached ("error"). Says which, plainly.
 */
export function JobsUnavailable({ reason, query }: { reason: "not_live" | "error"; query: string }) {
  const heading = reason === "error" ? "Job search isn’t available right now" : "We’re not listing vacancies yet";
  return (
    <Container className="py-12">
      <JobsIntro />
      <div role={reason === "error" ? "alert" : undefined} className="mt-8 rounded-lg border border-line bg-surface p-6">
        <h2 className="text-lg font-semibold text-ink">{heading}</h2>
        <p className="mt-2 max-w-2xl text-body">
          {reason === "error" ? (
            <>
              We couldn&rsquo;t load job listings just now. Please try again in a few minutes.
              {query && <> Your search for &ldquo;{query}&rdquo; is kept in the address bar, so refreshing will run it again.</>}
            </>
          ) : (
            <>
              Workerra is still being built and job listings aren&rsquo;t live.
              {query && <> Your search for &ldquo;{query}&rdquo; will work once they are.</>}
            </>
          )}{" "}
          Until then, the assistant can help you work out what to look for and get your CV ready.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={chatHref(query ? `Help me find ${query} jobs` : "Help me work out what jobs suit me")} className={PRIMARY}>
            Ask the assistant
          </Link>
          <Link href="/about" className={SECONDARY}>
            About Workerra
          </Link>
        </div>
      </div>
      <div className="mt-16 space-y-16">
        <JobSearchTips />
        <JobsFaq />
      </div>
    </Container>
  );
}

function JobsIntro() {
  return (
    <>
      <h1 className="text-3xl font-semibold text-ink">Find your next job</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Search roles across the UK by job title, skill, location and sector, then narrow down by how and where you want to
        work. Not sure what to search for? Ask the{" "}
        <Link href="/chat" className="font-medium text-accent hover:underline">
          Workerra assistant
        </Link>
        .
      </p>
    </>
  );
}

function NoMatches({ filters }: { filters: JobSearchFilters }) {
  const ask = ["Help me find", filters.q || "", "jobs", filters.location ? `in ${filters.location}` : ""].filter(Boolean).join(" ");
  const suggestions = [
    filters.q.includes(" ") && "Use fewer keywords: every word has to appear in the listing.",
    filters.q && "Check the spelling, or try a related job title or skill.",
    filters.location && "Try a nearby town or city, or tick Remote and clear the location.",
    (filters.workplace.length > 0 || filters.employmentType.length > 0) && "Untick some workplace or contract-type options.",
    filters.sector && "Search all sectors: some roles fit more than one.",
  ].filter((s): s is string => Boolean(s));

  return (
    <div className="mt-3 rounded-lg border border-line bg-surface px-5 py-6">
      <h2 className="text-lg font-semibold text-ink">No jobs match your search</h2>
      {suggestions.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-body">
          {suggestions.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/jobs" className={PRIMARY}>
          See all jobs
        </Link>
        <Link href={chatHref(ask)} className={SECONDARY}>
          Ask the assistant
        </Link>
      </div>
    </div>
  );
}

const INPUT = "mt-1 block w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-ink placeholder:text-faint";
const PRIMARY = "rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700";
const SECONDARY = "rounded-md border border-line-strong px-4 py-2 text-sm font-medium text-ink hover:border-brand-500";

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
    <fieldset className="text-sm text-body">
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
