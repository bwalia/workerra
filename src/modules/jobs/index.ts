import type { ModuleDescriptor } from "@/shared/modules";

export const jobsModule: ModuleDescriptor = {
  id: "jobs",
  name: "Jobs",
  summary: "Browse and search open roles with filters, and view full job details.",
  basePath: "/jobs",
  phase: 2,
  planned: ["Job listings", "Keyword and location search", "Workplace and contract-type filters", "Job detail pages"],
};

export { JobCard, SampleNotice } from "./components/JobCard";
export { JobDetail } from "./components/JobDetail";
export { JobSearch, JobsUnavailable } from "./components/JobSearch";
export { parseJobSearchParams } from "./search-params";
export {
  EMPLOYMENT_LABELS,
  SECTOR_LABELS,
  WORKPLACE_LABELS,
  countBySector,
  formatSalary,
  hasFilters,
  jobSearchQuery,
  searchJobs,
} from "./search";
export type * from "./types";
