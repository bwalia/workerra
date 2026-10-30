import Link from "next/link";
import { ChatEntry, chatHref } from "@/modules/chatbot";
import { JobCard, SECTOR_LABELS, SampleNotice, type Job, type JobSector } from "@/modules/jobs";
import { Container, Faq, Photo, type FaqItem, type PhotoId } from "@/shared/ui";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, LINK } from "./styles";

// Home page sections. The page (src/app/page.tsx) only decides which jobs to feature.

export const JOB_BRIEF_HREF = chatHref("Help me write a job brief");

export function HomeHero() {
  return (
    <section className="bg-gradient-to-b from-accent-soft to-canvas py-16 sm:py-20">
      <Container className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <p className="text-sm font-medium uppercase tracking-wide text-accent">UK jobs and hiring</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Find work or hire — just ask.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Tell the Workerra assistant what you&rsquo;re after in plain English. Job seekers get pointed to the right roles
            and help with their CV. Employers get help turning a vacancy into a clear job brief.
          </p>
          <div className="mt-8 flex w-full justify-center lg:justify-start">
            <ChatEntry />
          </div>
          <p className="mt-6 text-sm text-muted">
            Prefer to browse?{" "}
            <Link href="/jobs" className={LINK}>
              Search jobs
            </Link>{" "}
            or{" "}
            <Link href={JOB_BRIEF_HREF} className={LINK}>
              start a job brief
            </Link>
            .
          </p>
        </div>
        {/* Desktop only: on small screens it would push the assistant below the fold. */}
        <div className="relative hidden lg:block">
          <Photo
            id="hero-office"
            priority
            sizes="(min-width: 1280px) 30rem, 26rem"
            className="aspect-[5/4] w-full rounded-2xl shadow-xl ring-1 ring-line"
          />
          <div className="absolute -bottom-5 -left-5 rounded-xl border border-line bg-surface px-4 py-3 shadow-lg">
            <p className="text-sm font-semibold text-ink">Jobs across the UK</p>
            <p className="text-xs text-muted">Pay, location and contract up front</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

const STEPS: readonly { audience: string; id: string; photo: PhotoId; steps: readonly { title: string; body: string }[] }[] = [
  {
    audience: "Looking for work",
    id: "how-candidates",
    photo: "candidate-laptop",
    steps: [
      {
        title: "Say what you’re looking for",
        body: "The role, where you want to work, full-time or part-time, on-site or remote. No forms, no account needed.",
      },
      {
        title: "Browse matching jobs",
        body: "The assistant links you to a search with your filters already set, and every listing shows pay, workplace and contract type up front.",
      },
      {
        title: "Get application-ready",
        body: "Ask for feedback on your CV, a first draft of a cover letter, or practice questions before an interview.",
      },
    ],
  },
  {
    audience: "Hiring",
    id: "how-employers",
    photo: "employer-interview",
    steps: [
      {
        title: "Describe the vacancy",
        body: "Tell the assistant about the role in your own words, however rough. It asks for whatever’s missing.",
      },
      {
        title: "Shape the job brief",
        body: "Agree the title, responsibilities, must-have skills, location, working pattern, salary band and start date.",
      },
      {
        title: "Turn it into an advert",
        body: "Get a clear, inclusive job advert and screening questions, ready for when job posting opens on Workerra.",
      },
    ],
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works" className="py-16">
      <Container>
        <h2 id="how-it-works" className="text-2xl font-semibold text-ink">
          How Workerra works
        </h2>
        <p className="mt-2 max-w-2xl text-muted">Start with a question. The assistant works out what you need and takes you there.</p>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {STEPS.map((group) => (
            <div key={group.id} className="overflow-hidden rounded-lg border border-line bg-surface">
              <Photo id={group.photo} sizes="(min-width: 1152px) 552px, (min-width: 1024px) 50vw, 100vw" className="aspect-[2/1] w-full" />
              <div className="p-6">
                <h3 id={group.id} className="text-lg font-semibold text-ink">
                  {group.audience}
                </h3>
                <ol aria-labelledby={group.id} className="mt-4 space-y-4">
                  {group.steps.map((step, i) => (
                    <li key={step.title} className="flex gap-4">
                      <span
                        aria-hidden
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent"
                      >
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium text-ink">{step.title}</p>
                        <p className="mt-1 text-sm text-body">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

const BENEFITS: readonly { title: string; id: string; items: readonly string[]; cta: { label: string; href: string } }[] = [
  {
    title: "For job seekers",
    id: "benefits-candidates",
    items: [
      "Search by what you actually do: a job title, a skill or a qualification such as ACCA or the 18th Edition.",
      "See pay, location, workplace and contract type before you click, and a plain “not stated” when pay isn’t given.",
      "Practical help with CVs, cover letters and interviews whenever you need it.",
      "Browse and ask questions without creating an account.",
    ],
    cta: { label: "Browse jobs", href: "/jobs" },
  },
  {
    title: "For employers",
    id: "benefits-employers",
    items: [
      "A structured job brief, so everyone involved in the hire agrees what the role is before it’s advertised.",
      "Adverts written in clear, inclusive language that separate must-haves from nice-to-haves.",
      "Screening questions tied to the skills the role really needs.",
      "Advice on sourcing: the candidate profile to look for and where to find them.",
    ],
    cta: { label: "Start a job brief", href: JOB_BRIEF_HREF },
  },
];

export function Benefits() {
  return (
    <section aria-labelledby="why-workerra" className="border-y border-line bg-surface py-16">
      <Container>
        <h2 id="why-workerra" className="text-2xl font-semibold text-ink">
          Why use Workerra
        </h2>
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          {BENEFITS.map((group) => (
            <div key={group.id}>
              <h3 id={group.id} className="text-lg font-semibold text-ink">
                {group.title}
              </h3>
              <ul aria-labelledby={group.id} className="mt-4 space-y-3">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-3 text-body">
                    <span aria-hidden className="mt-1 text-accent">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href={group.cta.href} className={`mt-6 inline-block ${BUTTON_SECONDARY}`}>
                {group.cta.label}
              </Link>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

// Photo cards that open /jobs filtered to a sector. A few sectors only; the
// full list is in the /jobs filters.
const SECTORS: readonly { sector: JobSector; photo: PhotoId }[] = [
  { sector: "technology", photo: "team-office" },
  { sector: "construction", photo: "trades-site" },
  { sector: "logistics", photo: "hivis-team" },
  { sector: "marketing", photo: "team-table" },
];

export function Sectors() {
  return (
    <section aria-labelledby="sectors" className="pt-16">
      <Container>
        <h2 id="sectors" className="text-2xl font-semibold text-ink">
          Work in every sector
        </h2>
        <p className="mt-2 max-w-2xl text-muted">From offices to building sites. Pick a sector to see its jobs, or search everything.</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SECTORS.map(({ sector, photo }) => (
            <li key={sector}>
              <Link
                href={`/jobs?sector=${sector}`}
                className="group block overflow-hidden rounded-lg border border-line bg-surface transition hover:border-brand-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <div className="overflow-hidden">
                  <Photo
                    id={photo}
                    sizes="(min-width: 1152px) 270px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="aspect-[4/3] w-full transition duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                </div>
                <p className="flex items-center justify-between gap-2 px-4 py-3 font-medium text-ink">
                  {SECTOR_LABELS[sector]}
                  <span aria-hidden className="text-accent transition group-hover:translate-x-0.5">
                    →
                  </span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/** Latest listings, or an honest note when this ring has none or they couldn't be loaded. */
export function FeaturedJobs({ jobs, failed = false }: { jobs: readonly Job[] | null; failed?: boolean }) {
  return (
    <section aria-labelledby="featured-jobs" className="py-16">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="featured-jobs" className="text-2xl font-semibold text-ink">
              Latest jobs
            </h2>
            <p className="mt-2 text-muted">The most recently posted roles.</p>
          </div>
          {jobs?.length ? (
            <Link href="/jobs" className={LINK}>
              See all jobs <span aria-hidden>→</span>
            </Link>
          ) : null}
        </div>

        {jobs?.length ? (
          <>
            {jobs.some((job) => job.sample) && (
              <div className="mt-6">
                <SampleNotice>These are sample listings for testing Workerra, not real vacancies.</SampleNotice>
              </div>
            )}
            <ul className="mt-6 grid gap-4 md:grid-cols-3">
              {jobs.map((job) => (
                <li key={job.id}>
                  <JobCard job={job} headingLevel={3} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="mt-6 rounded-lg border border-line bg-surface p-6">
            <p className="text-body">
              {failed
                ? "We couldn’t load the latest jobs just now."
                : jobs
                  ? "There are no open jobs listed right now."
                  : "Job listings aren’t live on Workerra yet."}{" "}
              In the meantime, the assistant can help you work out what to search for and get your CV ready.
            </p>
            <Link href={chatHref("Help me work out what jobs suit me")} className={`mt-4 inline-block ${BUTTON_SECONDARY}`}>
              Ask the assistant
            </Link>
          </div>
        )}
      </Container>
    </section>
  );
}

// Built on render, not at import: JSX at module scope breaks importing this file in tests.
const homeFaq = (): readonly FaqItem[] => [
  {
    question: "What is Workerra?",
    answer: (
      <p>
        A UK jobs and recruitment platform built around an AI assistant. You ask in plain English, and it helps you find
        work or hire, then points you to the right page.
      </p>
    ),
  },
  {
    question: "Do I need an account?",
    answer: <p>No. You can search jobs and use the assistant without signing up. Candidate profiles and recruiter accounts are planned.</p>,
  },
  {
    question: "Can I apply for jobs or post a vacancy today?",
    answer: (
      <p>
        Not yet. Applications and job posting are being built. You can already get your CV and cover letter ready, or prepare
        a job brief and advert, with the{" "}
        <Link href="/chat" className={LINK}>
          assistant
        </Link>
        .
      </p>
    ),
  },
  {
    question: "Why do some jobs say “Sample”?",
    answer: (
      <p>
        They are test listings we use while building Workerra. The employers are made up and you can&rsquo;t apply for them.
        Real vacancies don&rsquo;t carry the Sample label.
      </p>
    ),
  },
  {
    question: "How accurate is the assistant?",
    answer: (
      <p>
        It&rsquo;s an AI and can make mistakes. Use it to get started and to check your thinking, and confirm important
        details, such as pay or required qualifications, with the employer.
      </p>
    ),
  },
];

export function HomeFaq() {
  return (
    <section className="pb-16">
      <Container className="max-w-4xl">
        <Faq id="home-faq" items={homeFaq()} />
        <p className="mt-4 text-sm text-muted">
          More answers on the{" "}
          <Link href="/jobs#jobs-faq" className={LINK}>
            jobs page
          </Link>{" "}
          and the{" "}
          <Link href="/chat#chat-faq" className={LINK}>
            assistant page
          </Link>
          .
        </p>
      </Container>
    </section>
  );
}

/** Closing two-way call to action, shared by the home and about pages. */
export function CallToAction() {
  return (
    <section aria-labelledby="get-started" className="bg-brand-900 py-16 text-white">
      <Container>
        <h2 id="get-started" className="text-2xl font-semibold">
          Ready when you are
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg bg-white/5 p-6 ring-1 ring-white/10">
            <h3 className="text-lg font-semibold">Looking for your next role?</h3>
            <p className="mt-2 text-white/80">Search jobs across the UK, or tell the assistant what you want to do next.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/jobs" className={BUTTON_PRIMARY}>
                Browse jobs
              </Link>
              <Link href={chatHref("I'm looking for a job.")} className={CTA_SECONDARY}>
                Ask the assistant
              </Link>
            </div>
          </div>
          <div className="rounded-lg bg-white/5 p-6 ring-1 ring-white/10">
            <h3 className="text-lg font-semibold">Hiring?</h3>
            <p className="mt-2 text-white/80">Work through your vacancy with the assistant and come away with a clear job brief and advert.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={JOB_BRIEF_HREF} className={BUTTON_PRIMARY}>
                Start a job brief
              </Link>
              <Link href="/recruiters" className={CTA_SECONDARY}>
                For recruiters
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

const CTA_SECONDARY = "rounded-md px-4 py-2 text-sm font-medium text-white ring-1 ring-white/40 hover:bg-white/10";
