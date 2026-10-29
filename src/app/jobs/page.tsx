import type { Metadata } from "next";
import { JobSearch, jobsModule, parseJobSearchParams, searchJobs } from "@/modules/jobs";
import { listJobs } from "@/modules/jobs/server";
import { ModulePlaceholder } from "@/shared/ui";

export const metadata: Metadata = { title: "Jobs" };
// Which listings a ring serves depends on runtime env (one image per ring), so never prerender.
export const dynamic = "force-dynamic";

export default function JobsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const filters = parseJobSearchParams(searchParams);
  const jobs = listJobs();
  if (!jobs) {
    return (
      <ModulePlaceholder module={jobsModule}>
        {filters.q && <p className="mt-6 text-sm text-slate-500">Search for “{filters.q}” will work once listings exist.</p>}
      </ModulePlaceholder>
    );
  }
  return <JobSearch filters={filters} result={searchJobs(jobs, filters)} />;
}
