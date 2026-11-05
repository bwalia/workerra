import type { Metadata } from "next";
import { candidatesModule } from "@/modules/candidates";
import { ModulePlaceholder } from "@/shared/ui";

export const metadata: Metadata = { title: "Candidates" };

export default function CandidatesPage() {
  return <ModulePlaceholder photo="resume-review" module={candidatesModule} />;
}
