import Link from "next/link";
import type { ReactNode } from "react";
import { chatHref } from "@/modules/chatbot";
import { Container } from "@/shared/ui";
import { EMPLOYMENT_LABELS, SECTOR_LABELS, WORKPLACE_LABELS, formatSalary } from "../search";
import type { Job } from "../types";
import { SampleNotice } from "./JobCard";

export function JobDetail({ job }: { job: Job }) {
  const salary = formatSalary(job.salary);
  const role = `the ${job.title} role at ${job.company.replace(/ \(Sample\)$/, "")}`;
  return (
    <Container className="py-12">
      <Link href="/jobs" className="text-sm text-muted hover:text-ink">
        ← All jobs
      </Link>
      {job.sample && (
        <div className="mt-6">
          <SampleNotice>This is a sample listing for testing Workerra. The employer is made up and it is not a real vacancy.</SampleNotice>
        </div>
      )}
      <h1 className="mt-6 text-3xl font-semibold text-ink">{job.title}</h1>
      <p className="mt-2 text-muted">
        {job.company} · {job.location}
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="max-w-2xl">
          <Section title="About the role">
            <p className="text-body">{job.description}</p>
          </Section>

          {job.responsibilities?.length ? (
            <Section title="What you’ll do">
              <List items={job.responsibilities} />
            </Section>
          ) : null}

          <Section title="What you’ll need">
            <List items={job.requirements} />
          </Section>

          {job.benefits?.length ? (
            <Section title="What’s on offer">
              <List items={job.benefits} />
            </Section>
          ) : null}

          <Section title="Skills">
            <ul className="flex flex-wrap gap-2">
              {job.skills.map((s) => (
                <li key={s} className="rounded-full bg-accent-soft px-3 py-1 text-sm text-accent">
                  {s}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="How to apply">
            <p className="text-body">
              {job.sample
                ? "This is a sample listing, so there’s nothing to apply for. On a real vacancy, applying through Workerra isn’t available yet."
                : "Applying through Workerra isn’t available yet."}{" "}
              Whenever you do apply for a role like this, it helps to:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-body">
              <li>Go through the requirements one by one and show where your CV meets each of them.</li>
              <li>Give a short example for the skills that matter most, with a result where you can.</li>
              <li>Keep your cover letter to a page and say why this employer and this role.</li>
              <li>Check the closing date and have your right-to-work documents ready.</li>
            </ul>
          </Section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-line bg-surface p-5">
            <h2 className="font-semibold text-ink">Job summary</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm lg:grid-cols-1">
              <Fact term="Salary" value={salary ?? "Not stated"} />
              <Fact term="Location" value={job.location} />
              <Fact term="Workplace" value={WORKPLACE_LABELS[job.workplace]} />
              <Fact term="Contract" value={EMPLOYMENT_LABELS[job.employmentType]} />
              <Fact term="Sector" value={SECTOR_LABELS[job.sector]} />
              <Fact term="Posted" value={formatDate(job.postedAt)} />
              <Fact term="Closes" value={job.closesAt ? formatDate(job.closesAt) : "Open until filled"} />
            </dl>
          </div>

          <div className="rounded-lg border border-line bg-surface p-5">
            <h2 className="font-semibold text-ink">Get ready with the assistant</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href={chatHref(`Help me tailor my CV for ${role}`)} className={LINK}>
                  Tailor my CV for this role
                </Link>
              </li>
              <li>
                <Link href={chatHref(`Help me write a cover letter for ${role}`)} className={LINK}>
                  Draft a cover letter
                </Link>
              </li>
              <li>
                <Link href={chatHref(`What interview questions should I prepare for ${role}?`)} className={LINK}>
                  Prepare for an interview
                </Link>
              </li>
              <li>
                <Link href={`/jobs?sector=${job.sector}`} className={LINK}>
                  More {SECTOR_LABELS[job.sector].toLowerCase()} jobs
                </Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </Container>
  );
}

const LINK = "font-medium text-accent hover:underline";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function List({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-body">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{term}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(isoDate),
  );
}
