import type { ModuleDescriptor } from "@/shared/modules";

export const atsModule: ModuleDescriptor = {
  id: "ats",
  name: "ATS",
  summary: "Applicant tracking: configurable application stages and a recruitment pipeline per job.",
  basePath: "/recruiters/pipeline",
  phase: 3,
  planned: ["Per-job pipeline board", "Configurable stages", "Stage history and notes", "Candidate communication log"],
};

export { DEFAULT_STAGES } from "./types";
export type { PipelineEntry, PipelineStage } from "./types";
