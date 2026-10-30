import type { Metadata } from "next";
import { applicationsModule } from "@/modules/applications";
import { ModulePlaceholder } from "@/shared/ui";

export const metadata: Metadata = { title: "Applications" };

export default function ApplicationsPage() {
  return <ModulePlaceholder photo="candidate-laptop" module={applicationsModule} />;
}
