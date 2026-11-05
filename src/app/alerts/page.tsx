import type { Metadata } from "next";
import { jobAlertsModule } from "@/modules/job-alerts";
import { ModulePlaceholder } from "@/shared/ui";

export const metadata: Metadata = { title: "Job alerts" };

export default function JobalertsPage() {
  return <ModulePlaceholder photo="hero-office" module={jobAlertsModule} />;
}
