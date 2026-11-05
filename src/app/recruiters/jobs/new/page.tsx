import type { Metadata } from "next";
import { PostJobForm, PostJobPage } from "@/modules/recruitment";
import { requireRecruiter } from "@/modules/recruitment/server";

export const metadata: Metadata = { title: "Post a job", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PostJobRoute() {
  const { session } = await requireRecruiter("/recruiters/jobs/new");
  return (
    <PostJobPage session={session}>
      <PostJobForm today={new Date().toISOString().slice(0, 10)} />
    </PostJobPage>
  );
}
