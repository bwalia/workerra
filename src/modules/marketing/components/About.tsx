import Link from "next/link";
import { chatHref } from "@/modules/chatbot";
import { Container, Faq, Photo, type FaqItem } from "@/shared/ui";
import { JOB_BRIEF_HREF } from "./Home";
import { LINK } from "./styles";

// /about: purpose, approach, values, and an honest account of what is live.

const APPROACH: readonly { title: string; body: string }[] = [
  {
    title: "Conversation first",
    body: "Most people know what they want before they know which filters to set. You can start by asking the assistant, and it takes you to the right search, page or next step.",
  },
  {
    title: "The facts up front",
    body: "Every listing leads with pay, location, workplace and contract type, so you can rule a job in or out before reading the detail.",
  },
  {
    title: "Practical help, not just listings",
    body: "Finding the job is only part of it. The assistant helps candidates with CVs, cover letters and interviews, and helps employers write the brief and the advert.",
  },
  {
    title: "Built in the open",
    body: "We say what works today and what doesn’t yet. Features that are still being built are labelled, and test data is marked as a sample.",
  },
];

const VALUES: readonly { title: string; body: string }[] = [
  { title: "Clarity", body: "Plain English, no jargon, and the details that matter where you can see them." },
  { title: "Honesty", body: "No made-up vacancies, no inflated claims, and a straight answer when we can’t help with something yet." },
  { title: "Fairness", body: "Adverts that focus on the skills a job really needs, written in language that welcomes every suitable candidate." },
  { title: "Respect", body: "For people’s time, and for their personal details: we only ask for what a task needs." },
];

const LIVE: readonly string[] = [
  "The Workerra assistant, for job searches, career questions, CV help and job briefs",
  "Job search with keyword, location, sector, workplace and contract-type filters",
  "Job detail pages with responsibilities, requirements and pay where the listing gives them",
];

const COMING: readonly { label: string; href: string }[] = [
  { label: "Candidate profiles and CV upload", href: "/candidates" },
  { label: "Applying for jobs and tracking applications", href: "/applications" },
  { label: "Job alerts from a search or the assistant", href: "/alerts" },
  { label: "Recruiter accounts, job posting and a hiring pipeline", href: "/recruiters" },
];

// Built on render, not at import: JSX at module scope breaks importing this file in tests.
const aboutFaq = (): readonly FaqItem[] => [
  {
    question: "Who is Workerra for?",
    answer: (
      <p>
        People looking for work in the UK, from first jobs and internships to experienced professionals and contractors, and
        the employers and recruiters hiring them.
      </p>
    ),
  },
  {
    question: "Are the jobs on Workerra real?",
    answer: (
      <p>
        Live vacancies aren&rsquo;t published yet. Where you see listings marked Sample, they are test data with made-up
        employers.
      </p>
    ),
  },
  {
    question: "How do I get in touch?",
    answer: (
      <p>
        <Link href={chatHref("I'd like to contact the Workerra recruitment team.")} className={LINK}>
          Ask the assistant to contact the team
        </Link>
        . It shares the team&rsquo;s contact details where they&rsquo;re available on this site.
      </p>
    ),
  },
];

export function About() {
  return (
    <>
      <section className="bg-gradient-to-b from-accent-soft to-canvas py-16">
        <Container className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-accent">About Workerra</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-ink">
              Connecting UK employers with the people they need
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted">
              Workerra is a jobs and recruitment platform with an AI assistant at its heart, so getting started is as simple
              as asking a question, whether you&rsquo;re looking for work or looking to hire.
            </p>
          </div>
          <Photo
            id="handshake"
            priority
            sizes="(min-width: 1024px) 28rem, (min-width: 768px) 22rem, 100vw"
            className="aspect-[3/2] w-full rounded-2xl shadow-lg ring-1 ring-line"
          />
        </Container>
      </section>

      <Container className="space-y-16 py-16">
        <section aria-labelledby="purpose" className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <h2 id="purpose" className="text-2xl font-semibold text-ink">
            Our purpose
          </h2>
          <div className="max-w-2xl space-y-4 text-body">
            <p>
              Job hunting and hiring both take longer than they should. Candidates sift through vague adverts and wonder what
              the pay is. Employers write adverts in a hurry and then sort through applications that don&rsquo;t fit.
            </p>
            <p>
              Workerra exists to make both sides clearer: helping people find work that suits them, and helping employers say
              exactly what they need so the right people apply.
            </p>
          </div>
        </section>

        <section aria-labelledby="approach">
          <h2 id="approach" className="text-2xl font-semibold text-ink">
            Our approach
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {APPROACH.map((item) => (
              <li key={item.title} className="rounded-lg border border-line bg-surface p-5">
                <h3 className="font-medium text-ink">{item.title}</h3>
                <p className="mt-2 text-sm text-body">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="values">
          <h2 id="values" className="text-2xl font-semibold text-ink">
            What we value
          </h2>
          <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => (
              <div key={value.title} className="border-l-2 border-brand-500 pl-4">
                <dt className="font-semibold text-ink">{value.title}</dt>
                <dd className="mt-1 text-sm text-body">{value.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="how-we-help" className="grid gap-6 lg:grid-cols-2">
          <h2 id="how-we-help" className="sr-only">
            How we help
          </h2>
          <div className="rounded-lg border border-line bg-surface p-6">
            <h3 className="text-lg font-semibold text-ink">How we help candidates</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-body">
              <li>Turn &ldquo;I want something closer to home&rdquo; into a search that finds it.</li>
              <li>Explore other careers and what it takes to move into them.</li>
              <li>Get specific feedback on your CV and a first draft of your cover letter.</li>
              <li>Prepare for interviews with questions relevant to the role.</li>
            </ul>
            <Link href="/jobs" className={`mt-5 inline-block ${LINK}`}>
              Browse jobs <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="rounded-lg border border-line bg-surface p-6">
            <h3 className="text-lg font-semibold text-ink">How we help employers</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-body">
              <li>Shape a job brief: responsibilities, must-have skills, location, pay and start date.</li>
              <li>Write a clear, inclusive advert from that brief.</li>
              <li>Decide on the candidate profile, sourcing approach and screening questions.</li>
              <li>Get ready for job posting and the hiring pipeline as they launch.</li>
            </ul>
            <Link href={JOB_BRIEF_HREF} className={`mt-5 inline-block ${LINK}`}>
              Start a job brief <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        <section aria-labelledby="today" className="rounded-lg border border-line bg-surface p-6">
          <h2 id="today" className="text-2xl font-semibold text-ink">
            Where Workerra is today
          </h2>
          <p className="mt-2 max-w-2xl text-muted">Workerra is new and being built step by step. Here&rsquo;s what you can use now and what&rsquo;s next.</p>
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-ink">Available now</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-body">
                {LIVE.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-ink">Coming next</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-body">
                {COMING.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="hover:text-accent hover:underline">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <div className="max-w-4xl">
          <Faq id="about-faq" items={aboutFaq()} />
        </div>
      </Container>
    </>
  );
}
