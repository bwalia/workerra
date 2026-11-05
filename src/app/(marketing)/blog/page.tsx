import type { Metadata } from "next";
import { marketingModule } from "@/modules/marketing";
import { ModulePlaceholder } from "@/shared/ui";

export const metadata: Metadata = { title: "Blog" };

export default function BlogPage() {
  return <ModulePlaceholder photo="team-office" module={{ ...marketingModule, name: "Blog", summary: "News, hiring advice and career guides." }} />;
}
