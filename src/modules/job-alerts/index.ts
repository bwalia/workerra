import type { ModuleDescriptor } from "@/shared/modules";

export const jobAlertsModule: ModuleDescriptor = {
  id: "job-alerts",
  name: "Job alerts",
  summary: "Candidates ask for alerts (from search or the chatbot) and get notified when matching jobs appear.",
  basePath: "/alerts",
  phase: 4,
  planned: ["Save a search as an alert", "Create alerts from the chatbot", "Instant, daily or weekly digests", "Unsubscribe and manage alerts"],
};

export type * from "./types";
