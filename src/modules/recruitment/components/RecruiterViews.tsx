import Link from "next/link";
import { chatHref } from "@/modules/chatbot";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, Container, LINK } from "@/shared/ui";
import type { Session } from "@/shared/auth";
import { signOut } from "../actions";
import type { ApiApplication, ApiListing, AtsJobStatus } from "../opsapi-types";
import { JobStatusControls } from "./JobStatusControls";

// Server-rendered recruiter pages. Data comes from OpsAPI as the signed-in
// recruiter (src/app/recruiters/** loads it through the module's server entry).

const STATUS_LABELS: Record<AtsJobStatus, string> = { draft: "Draft", open: "Open", paused: "Paused", closed: "Closed" };

/** /recruiters for someone who isn't signed in. */
export function RecruiterLanding({ signInAvailable }: { signInAvailable: boolean }) {
  return (
    <Container className="py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-accent">For recruiters and employers</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink">Post jobs and read applications</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Publish a vacancy on Workerra in a few minutes. Candidates apply from the job page without needing an account, and
        every application lands in your workspace with their cover letter and links.
      </p>
      <ul className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
        {[
          ["Post", "Title, pay, location, requirements: the job is live as soon as you publish it."],
          ["Review", "See who applied for each job, with their cover letter, CV links and contact details."],
          ["Close", "Pause or close a job when you have enough applicants; reopen it any time."],
        ].map(([title, body]) => (
          <li key={title} className="rounded-lg border border-line bg-surface p-4">
            <h2 className="font-semibold text-ink">{title}</h2>
            <p className="mt-1 text-sm text-body">{body}</p>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap gap-3">
        {signInAvailable ? (
          <Link href="/recruiters/sign-in" className={BUTTON_PRIMARY}>
            Sign in to post a job
          </Link>
        ) : (
          <p className="max-w-2xl rounded-lg border border-line bg-surface p-4 text-body">
            Recruiter sign-in isn&rsquo;t switched on for this site yet.
          </p>
        )}
        <Link href={chatHref("Help me write a job brief")} className={BUTTON_SECONDARY}>
          Write a job brief with the assistant
        </Link>
      </div>
      {signInAvailable && (
        <p className="mt-6 text-sm text-muted">
          Recruiter accounts are set up by the Workerra team. Sign in with the email address your invitation went to.
        </p>
      )}
    </Container>
  );
}

function SignedInBar({ session }: { session: Session }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 text-sm text-muted">
      <span>
        Signed in as <span className="font-medium text-ink">{session.name}</span> ({session.email})
      </span>
      <form action={signOut}>
        <button type="submit" className="font-medium text-accent hover:underline">
          Sign out
        </button>
      </form>
    </div>
  );
}

/** /recruiters for a signed-in recruiter: the workspace's jobs. */
export function RecruiterDashboard({ session, listings, total }: { session: Session; listings: ApiListing[]; total: number }) {
  return (
    <Container className="py-12">
      <SignedInBar session={session} />
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Your jobs</h1>
          <p className="mt-2 text-muted">
            {total === 0 ? "You haven’t posted any jobs yet." : `${total} job${total === 1 ? "" : "s"} in your workspace.`}
          </p>
        </div>
        <Link href="/recruiters/jobs/new" className={BUTTON_PRIMARY}>
          Post a job
        </Link>
      </div>

      {listings.length > 0 ? (
        <ul className="mt-8 grid gap-3">
          {listings.map((job) => (
            <li key={job.uuid} className="rounded-lg border border-line bg-surface p-4 hover:border-brand-500">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-ink">
                  <Link href={`/recruiters/jobs/${job.uuid}`} className="hover:text-accent">
                    {job.title}
                  </Link>
                </h2>
                <StatusBadge listing={job} />
              </div>
              <p className="mt-1 text-sm text-muted">
                {job.company} · {job.location} · posted {formatDate(job.posted_at)}
                {job.closes_at && <> · closes {formatDate(job.closes_at)}</>}
              </p>
              <p className="mt-2 text-sm text-body">
                {job.applications === 0
                  ? "No applications yet"
                  : `${job.applications} application${job.applications === 1 ? "" : "s"}`}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-lg border border-line bg-surface p-6">
          <p className="text-body">
            Post your first job and it appears on the Workerra jobs board straight away. Not sure what to write?{" "}
            <Link href={chatHref("Help me write a job brief")} className={LINK}>
              Draft it with the assistant
            </Link>{" "}
            first.
          </p>
        </div>
      )}
    </Container>
  );
}

/** /recruiters/jobs/new */
export function PostJobPage({ session, children }: { session: Session; children: React.ReactNode }) {
  return (
    <Container className="py-12">
      <SignedInBar session={session} />
      <Link href="/recruiters" className="mt-6 inline-block text-sm text-muted hover:text-ink">
        ← Your jobs
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-ink">Post a job</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Lead with what candidates check first: pay, location, where the work is done and the contract type.
      </p>
      <div className="mt-8">{children}</div>
    </Container>
  );
}

/** /recruiters/jobs/[jobId]: one job and who applied. */
export function RecruiterJob({
  session,
  listing,
  applications,
  justPosted,
}: {
  session: Session;
  listing: ApiListing;
  applications: ApiApplication[];
  justPosted: boolean;
}) {
  return (
    <Container className="py-12">
      <SignedInBar session={session} />
      <Link href="/recruiters" className="mt-6 inline-block text-sm text-muted hover:text-ink">
        ← Your jobs
      </Link>
      {justPosted && (
        <p role="status" className="mt-6 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
          Your job is live on Workerra.{" "}
          <Link href={`/jobs/${listing.uuid}`} className="font-medium underline">
            See it as candidates do
          </Link>
          .
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl font-semibold text-ink">{listing.title}</h1>
        <StatusBadge listing={listing} />
      </div>
      <p className="mt-2 text-muted">
        {listing.company} · {listing.location} · posted {formatDate(listing.posted_at)}
        {listing.closes_at && <> · closes {formatDate(listing.closes_at)}</>}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {listing.listed && (
          <Link href={`/jobs/${listing.uuid}`} className={LINK}>
            View the public listing
          </Link>
        )}
        <JobStatusControls jobId={listing.uuid} status={listing.status} />
      </div>

      <h2 className="mt-12 text-xl font-semibold text-ink">
        Applications <span className="text-muted">({applications.length})</span>
      </h2>
      {applications.length === 0 ? (
        <p className="mt-3 text-body">
          {listing.listed ? "No one has applied yet. Applications appear here as soon as they’re sent." : "No applications."}
        </p>
      ) : (
        <ul className="mt-4 grid gap-4">
          {applications.map((a) => (
            <li key={a.uuid} className="rounded-lg border border-line bg-surface p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-ink">{a.name}</h3>
                <span className="text-sm text-muted">
                  {formatDateTime(a.applied_at)} · {a.stage.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-1 text-sm">
                <a href={`mailto:${a.email}`} className={LINK}>
                  {a.email}
                </a>
                {a.phone && <span className="text-muted"> · {a.phone}</span>}
              </p>
              {a.links.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {a.links.map((href) => (
                    <li key={href}>
                      <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={LINK}>
                        {linkLabel(href)}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {a.cover_letter && <p className="mt-3 whitespace-pre-line text-body">{a.cover_letter}</p>}
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

function StatusBadge({ listing }: { listing: ApiListing }) {
  const live = listing.listed;
  const label = live ? "Live" : listing.status === "open" ? "Past closing date" : STATUS_LABELS[listing.status];
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${
        live
          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200"
          : "bg-subtle text-muted"
      }`}
    >
      {label}
    </span>
  );
}

function linkLabel(href: string): string {
  try {
    const url = new URL(href);
    return url.hostname.replace(/^www\./, "") + (url.pathname.length > 1 ? url.pathname : "");
  } catch {
    return href;
  }
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(isoDate.slice(0, 10)),
  );
}

function formatDateTime(value: string): string {
  // OpsAPI sends "2026-11-04 15:44:47.131084+00".
  const date = new Date(value.replace(" ", "T").replace(/\+00$/, "Z"));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(date);
}
