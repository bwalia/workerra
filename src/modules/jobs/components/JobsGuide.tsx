import Link from "next/link";
import { chatHref } from "@/modules/chatbot";
import { Faq, type FaqItem } from "@/shared/ui";
import { SECTOR_LABELS, jobSearchQuery } from "../search";
import type { JobSearchFilters, JobSector } from "../types";

// Guidance around the /jobs listings: browsing by sector, search tips and FAQs.

const NO_FILTERS: JobSearchFilters = { q: "", location: "", workplace: [], employmentType: [], sector: null, page: 1 };

export function JobCategories({ counts, current }: { counts: Record<JobSector, number>; current: JobSector | null }) {
  return (
    <section aria-labelledby="job-categories">
      <h2 id="job-categories" className="text-2xl font-semibold text-ink">
        Browse by sector
      </h2>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.entries(SECTOR_LABELS) as [JobSector, string][]).map(([sector, label]) => (
          <li key={sector}>
            <Link
              href={jobSearchQuery({ ...NO_FILTERS, sector }, 1)}
              aria-current={current === sector ? "page" : undefined}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 hover:border-brand-500 aria-[current=page]:border-brand-500"
            >
              <span className="font-medium text-ink">{label}</span>
              <span className="text-sm text-muted">{counts[sector] === 1 ? "1 job" : `${counts[sector]} jobs`}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const TIPS: readonly { title: string; body: string }[] = [
  {
    title: "Start broad, then narrow down",
    body: "Every keyword has to appear in the listing, so one or two words find more than a full sentence. Try a job title, a skill or a qualification: “nurse”, “React”, “ACCA” or “forklift”.",
  },
  {
    title: "Search by town or city",
    body: "Type a place name such as “Leeds” or “Cardiff” rather than a postcode. For work from home, tick Remote and leave the location empty.",
  },
  {
    title: "Pick the right contract type",
    body: "Contract roles are usually fixed-term or paid by the day, temporary roles cover a set period such as the Christmas peak, and part-time roles list their weekly hours in the description.",
  },
  {
    title: "Save or share a search",
    body: "Each search has its own web address, so you can bookmark it, come back later or send it to someone.",
  },
];

export function JobSearchTips() {
  return (
    <section aria-labelledby="search-tips">
      <h2 id="search-tips" className="text-2xl font-semibold text-ink">
        Search tips
      </h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {TIPS.map((tip) => (
          <li key={tip.title} className="rounded-lg border border-line bg-surface p-5">
            <h3 className="font-medium text-ink">{tip.title}</h3>
            <p className="mt-2 text-sm text-body">{tip.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

const LINK = "font-medium text-accent hover:underline";

// Built on render, not at import: JSX at module scope breaks importing this file in tests.
const jobsFaq = (): readonly FaqItem[] => [
  {
    question: "Are these real vacancies?",
    answer: (
      <p>
        Listings marked <strong>Sample</strong> are test data we use while Workerra is being built. The companies are made
        up and you can&rsquo;t apply for them. Real vacancies don&rsquo;t carry the Sample label.
      </p>
    ),
  },
  {
    question: "How do I apply for a job?",
    answer: (
      <p>
        Applying through Workerra isn&rsquo;t available yet. In the meantime, the{" "}
        <Link href={chatHref("Help me tailor my CV to a job")} className={LINK}>
          assistant
        </Link>{" "}
        can help you tailor your CV, draft a cover letter or prepare for an interview.
      </p>
    ),
  },
  {
    question: "What does “outside IR35” mean on a contract role?",
    answer: (
      <p>
        IR35 is the set of UK tax rules that decide whether a contractor is treated like an employee for tax. A role outside
        IR35 means the client has assessed the work as genuinely self-employed. For public-sector clients and medium or large
        private-sector clients, the client makes that call, so ask to see their status determination if you&rsquo;re unsure.
      </p>
    ),
  },
  {
    question: "How is pay shown?",
    answer: (
      <p>
        As the employer gives it: a yearly salary for most permanent roles, a day rate for contracts and an hourly rate for
        shift and temporary work. If a listing doesn&rsquo;t state pay, we say so rather than guess.
      </p>
    ),
  },
  {
    question: "Do I need the right to work in the UK?",
    answer: (
      <p>
        Yes. UK employers must check that every new starter has the right to work here before they begin. If you need visa
        sponsorship, look for it in the job description or ask the employer before you apply.
      </p>
    ),
  },
  {
    question: "Can I get alerts for new jobs?",
    answer: (
      <p>
        Not yet. <Link href="/alerts" className={LINK}>Job alerts</Link> are planned: you&rsquo;ll be able to save a search,
        or ask the assistant, and hear when matching jobs are posted.
      </p>
    ),
  },
];

export function JobsFaq() {
  return <Faq id="jobs-faq" items={jobsFaq()} />;
}
