import type { ModuleDescriptor } from "@/shared/modules";

export const applicationsModule: ModuleDescriptor = {
  id: "applications",
  name: "Applications",
  summary: "Apply directly, via LinkedIn, or with an AI-assisted application, then track every application.",
  basePath: "/applications",
  phase: 3,
  planned: ["Direct apply", "Apply with LinkedIn", "AI-assisted cover letters and answers", "Application tracking"],
};

export type * from "./types";
