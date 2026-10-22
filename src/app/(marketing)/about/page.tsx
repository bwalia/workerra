import type { Metadata } from "next";
import { marketingModule } from "@/modules/marketing";
import { ModulePlaceholder } from "@/shared/ui";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return <ModulePlaceholder module={marketingModule} />;
}
