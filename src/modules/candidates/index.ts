import type { ModuleDescriptor } from "@/shared/modules";

export const candidatesModule: ModuleDescriptor = {
  id: "candidates",
  name: "Candidates",
  summary: "Candidate registration, profiles, CV uploads and job preferences.",
  basePath: "/candidates",
  phase: 2,
  planned: ["Registration", "Profile editor", "CV upload and parsing", "Job preferences"],
};

export type * from "./types";
