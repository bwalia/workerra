import type { Metadata } from "next";
import { jobsModule, parseJobSearchParams } from "@/modules/jobs";
import { ModulePlaceholder } from "@/shared/ui";

export const metadata: Metadata = { title: "Jobs" };

export default function JobsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const filters = parseJobSearchParams(searchParams);
  return (
    <ModulePlaceholder module={jobsModule}>
      {filters.q && <p className="mt-6 text-sm text-slate-500">Search for “{filters.q}” will work once listings exist.</p>}
    </ModulePlaceholder>
  );
}
