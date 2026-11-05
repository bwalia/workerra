import type { Metadata } from "next";
import { RecruiterDashboard, RecruiterLanding } from "@/modules/recruitment";
import { listingsFor, recruiterSignInAvailable, renewOnUnauthorized, requireRecruiter } from "@/modules/recruitment/server";
import { getSession } from "@/shared/auth";

export const metadata: Metadata = {
  title: "Recruiters",
  description: "Post jobs on Workerra and read the applications they get.",
};
export const dynamic = "force-dynamic";

export default async function RecruitersPage() {
  const available = recruiterSignInAvailable();
  if (!available || !(await getSession())) return <RecruiterLanding signInAvailable={available} />;

  const { session, opsapi } = await requireRecruiter("/recruiters");
  let result;
  try {
    result = await listingsFor(opsapi);
  } catch (err) {
    renewOnUnauthorized(err, "/recruiters");
    throw err;
  }
  return <RecruiterDashboard session={session} listings={result.listings} total={result.meta.total} />;
}
