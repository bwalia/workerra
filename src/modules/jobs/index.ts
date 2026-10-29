import type { ModuleDescriptor } from "@/shared/modules";

export const jobsModule: ModuleDescriptor = {
  id: "jobs",
  name: "Jobs",
  summary: "Browse and search open roles with filters, and view full job details.",
  basePath: "/jobs",
  phase: 2,
  planned: ["Job listings", "Keyword and location search", "Workplace and contract-type filters", "Job detail pages"],
};

export { JobDetail } from "./components/JobDetail";
export { JobSearch } from "./components/JobSearch";
export { parseJobSearchParams } from "./search-params";
export { EMPLOYMENT_LABELS, WORKPLACE_LABELS, formatSalary, jobSearchQuery, searchJobs } from "./search";
export type * from "./types";
