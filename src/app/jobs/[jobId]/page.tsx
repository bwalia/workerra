import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobDetail } from "@/modules/jobs";
import { findJob } from "@/modules/jobs/server";

export const dynamic = "force-dynamic";

type Props = { params: { jobId: string } };

export function generateMetadata({ params }: Props): Metadata {
  const job = findJob(params.jobId);
  if (!job) return {};
  // Sample listings are test data: keep them out of search engines on every ring.
  return { title: `${job.title} · ${job.company}`, robots: job.sample ? { index: false } : undefined };
}

export default function JobDetailPage({ params }: Props) {
  const job = findJob(params.jobId);
  if (!job) notFound();
  return <JobDetail job={job} />;
}
