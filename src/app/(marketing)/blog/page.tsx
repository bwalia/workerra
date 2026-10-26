import type { Metadata } from "next";
import { marketingModule } from "@/modules/marketing";
import { ModulePlaceholder } from "@/shared/ui";

export const metadata: Metadata = { title: "Blog" };

export default function BlogPage() {
  return <ModulePlaceholder module={{ ...marketingModule, name: "Blog", summary: "News, hiring advice and career guides." }} />;
}
