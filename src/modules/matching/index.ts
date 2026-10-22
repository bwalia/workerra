import type { ModuleDescriptor } from "@/shared/modules";

export const matchingModule: ModuleDescriptor = {
  id: "matching",
  name: "AI matching",
  summary: "Candidate-to-job matching delegated to JobShout AI agents; Workerra stores and explains the results.",
  basePath: null,
  phase: 4,
  planned: ["Candidate → job recommendations", "Job → candidate shortlists for recruiters", "Explainable match reasons", "Match-triggered job alerts"],
};

export type * from "./types";
