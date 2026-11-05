import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/modules/recruitment";
import { recruiterSignInAvailable, safeNext } from "@/modules/recruitment/server";
import { getSession } from "@/shared/auth";
import { Container } from "@/shared/ui";

export const metadata: Metadata = { title: "Recruiter sign-in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RecruiterSignInPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = safeNext(searchParams.next);
  if (!recruiterSignInAvailable()) redirect("/recruiters");
  if (await getSession()) redirect(next);
  return (
    <Container className="max-w-md py-16">
      <h1 className="text-3xl font-semibold text-ink">Recruiter sign-in</h1>
      <p className="mt-2 text-muted">Sign in to post jobs and read applications.</p>
      <div className="mt-8 rounded-lg border border-line bg-surface p-6">
        <SignInForm next={next} />
      </div>
    </Container>
  );
}
