import Link from "next/link";
import { Container } from "@/shared/ui";
import { EMPLOYMENT_LABELS, WORKPLACE_LABELS, formatSalary } from "../search";
import type { Job } from "../types";

export function JobDetail({ job }: { job: Job }) {
  const salary = formatSalary(job.salary);
  return (
    <Container className="py-12">
      <Link href="/jobs" className="text-sm text-slate-600 hover:text-slate-900">
        ← All jobs
      </Link>
      {job.sample && (
        <p role="note" className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This is a sample listing for testing. It is not a real vacancy.
        </p>
      )}
      <h1 className="mt-6 text-3xl font-semibold text-slate-900">{job.title}</h1>
      <p className="mt-2 text-slate-600">
        {job.company} · {job.location}
      </p>

      <dl className="mt-6 grid max-w-2xl grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <Fact term="Workplace" value={WORKPLACE_LABELS[job.workplace]} />
        <Fact term="Contract" value={EMPLOYMENT_LABELS[job.employmentType]} />
        <Fact term="Salary" value={salary ?? "Not stated"} />
        <Fact term="Closes" value={job.closesAt ? formatDate(job.closesAt) : "Open until filled"} />
      </dl>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">About the role</h2>
      <p className="mt-2 max-w-2xl text-slate-700">{job.description}</p>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Requirements</h2>
      <ul className="mt-2 max-w-2xl list-disc space-y-1 pl-5 text-slate-700">
        {job.requirements.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Skills</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {job.skills.map((s) => (
          <li key={s} className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
            {s}
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm text-slate-500">Posted {formatDate(job.postedAt)}. Applications aren&rsquo;t live on Workerra yet.</p>
    </Container>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{term}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(isoDate),
  );
}
