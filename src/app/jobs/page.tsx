import type { Metadata } from "next";
import { JobSearch, JobsUnavailable, parseJobSearchParams } from "@/modules/jobs";
import { jobSource } from "@/modules/jobs/server";
import { logger } from "@/shared/logging";

export const metadata: Metadata = {
  title: "Jobs",
  description: "Search UK jobs by title, skill, location and sector, with tips on searching and applying.",
};
// Which listings a ring serves depends on runtime env (one image per ring), so never prerender.
export const dynamic = "force-dynamic";

export default async function JobsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const filters = parseJobSearchParams(searchParams);
  const source = jobSource();
  if (!source) return <JobsUnavailable reason="not_live" query={filters.q} />;
  try {
    const [result, sectorCounts] = await Promise.all([source.search(filters), source.sectorCounts()]);
    return <JobSearch filters={filters} result={result} sectorCounts={sectorCounts} />;
  } catch (err) {
    logger.error("job search unavailable", { error: err });
    return <JobsUnavailable reason="error" query={filters.q} />;
  }
}
