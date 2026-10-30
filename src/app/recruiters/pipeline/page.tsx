import type { Metadata } from "next";
import { atsModule } from "@/modules/ats";
import { ModulePlaceholder } from "@/shared/ui";

export const metadata: Metadata = { title: "Pipeline" };

export default function PipelinePage() {
  return <ModulePlaceholder photo="team-table" module={atsModule} />;
}
