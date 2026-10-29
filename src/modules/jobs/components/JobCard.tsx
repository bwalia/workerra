import Link from "next/link";
import { EMPLOYMENT_LABELS, SECTOR_LABELS, WORKPLACE_LABELS, formatSalary } from "../search";
import type { Job } from "../types";

/** One listing in search results and on the home page. */
export function JobCard({ job, headingLevel = 2 }: { job: Job; headingLevel?: 2 | 3 }) {
  const salary = formatSalary(job.salary);
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="h-full rounded-lg border border-line bg-surface p-4 hover:border-brand-500">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Heading className="text-lg font-semibold text-ink">
          <Link href={`/jobs/${job.id}`} className="hover:text-accent">
            {job.title}
          </Link>
        </Heading>
        {job.sample && <SampleBadge />}
      </div>
      <p className="mt-1 text-sm text-muted">
        {job.company} · {job.location}
      </p>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-body">
        <span>{SECTOR_LABELS[job.sector]}</span>
        <span>{WORKPLACE_LABELS[job.workplace]}</span>
        <span>{EMPLOYMENT_LABELS[job.employmentType]}</span>
        {salary && <span>{salary}</span>}
      </p>
    </article>
  );
}

export function SampleBadge() {
  return (
    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
      Sample
    </span>
  );
}

/** Says plainly that sample listings are test data, wherever they appear. */
export function SampleNotice({ children }: { children: string }) {
  return (
    <p
      role="note"
      className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
    >
      {children}
    </p>
  );
}
