import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobDetail, JobsUnavailable } from "@/modules/jobs";
import { findJob } from "@/modules/jobs/server";
import { logger } from "@/shared/logging";

export const dynamic = "force-dynamic";

type Props = { params: { jobId: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const job = await findJob(params.jobId).catch(() => null);
  if (!job) return {};
  // Sample listings are test data: keep them out of search engines on every ring.
  return { title: `${job.title} · ${job.company}`, robots: job.sample ? { index: false } : undefined };
}

export default async function JobDetailPage({ params }: Props) {
  let job;
  try {
    job = await findJob(params.jobId);
  } catch (err) {
    logger.error("job detail unavailable", { error: err });
    return <JobsUnavailable reason="error" query="" />;
  }
  if (!job) notFound();
  return <JobDetail job={job} />;
}
