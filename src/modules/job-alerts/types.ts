import type { JobSearchFilters } from "@/modules/jobs";

export type AlertFrequency = "instant" | "daily" | "weekly";
export type AlertChannel = "email" | "chat";

export interface JobAlert {
  id: string;
  candidateId: string;
  filters: Omit<JobSearchFilters, "page">;
  frequency: AlertFrequency;
  channels: AlertChannel[];
  active: boolean;
  lastSentAt: string | null;
}
