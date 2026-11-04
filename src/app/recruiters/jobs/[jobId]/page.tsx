import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecruiterJob } from "@/modules/recruitment";
import { listingWithApplications, renewOnUnauthorized, requireRecruiter } from "@/modules/recruitment/server";

export const metadata: Metadata = { title: "Job applications", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { params: { jobId: string }; searchParams: { posted?: string } };

export default async function RecruiterJobRoute({ params, searchParams }: Props) {
  const path = `/recruiters/jobs/${params.jobId}`;
  const { session, opsapi } = await requireRecruiter(path);
  let result;
  try {
    result = await listingWithApplications(opsapi, params.jobId);
  } catch (err) {
    renewOnUnauthorized(err, path);
    throw err;
  }
  if (!result) notFound();
  return <RecruiterJob session={session} {...result} justPosted={searchParams.posted === "1"} />;
}
