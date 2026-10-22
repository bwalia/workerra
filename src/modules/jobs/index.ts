import type { ModuleDescriptor } from "@/shared/modules";

export const jobsModule: ModuleDescriptor = {
  id: "jobs",
  name: "Jobs",
  summary: "Browse and search open roles with filters, and view full job details.",
  basePath: "/jobs",
  phase: 2,
  planned: ["Job listings", "Keyword and location search", "Workplace and contract-type filters", "Job detail pages"],
};

export { parseJobSearchParams } from "./search-params";
export type * from "./types";
