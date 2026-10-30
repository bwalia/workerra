import type { Metadata } from "next";
import { recruitmentModule } from "@/modules/recruitment";
import { ModulePlaceholder } from "@/shared/ui";

export const metadata: Metadata = { title: "Recruiters" };

export default function RecruitersPage() {
  return <ModulePlaceholder photo="employer-interview" module={recruitmentModule} />;
}
