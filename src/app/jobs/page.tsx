import type { Metadata } from "next";
import { JobSearch, JobsUnavailable, countBySector, parseJobSearchParams, searchJobs } from "@/modules/jobs";
import { listJobs } from "@/modules/jobs/server";

export const metadata: Metadata = {
  title: "Jobs",
  description: "Search UK jobs by title, skill, location and sector, with tips on searching and applying.",
};
// Which listings a ring serves depends on runtime env (one image per ring), so never prerender.
export const dynamic = "force-dynamic";

export default function JobsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const filters = parseJobSearchParams(searchParams);
  const jobs = listJobs();
  if (!jobs) return <JobsUnavailable query={filters.q} />;
  return <JobSearch filters={filters} result={searchJobs(jobs, filters)} sectorCounts={countBySector(jobs)} />;
}
