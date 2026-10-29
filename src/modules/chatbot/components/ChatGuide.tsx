import Link from "next/link";
import { Faq, type FaqItem } from "@/shared/ui";
import { ASK_TOPICS } from "../topics";

// Static guidance beside the conversation on /chat: what to ask, and what to expect.

export function ChatGuide() {
  return (
    <section aria-labelledby="ask-topics">
      <h2 id="ask-topics" className="text-lg font-semibold text-ink">
        What you can ask
      </h2>
      <ul className="mt-4 space-y-4">
        {ASK_TOPICS.map((topic) => (
          <li key={topic.title} className="rounded-lg border border-line bg-surface p-4">
            <h3 className="font-medium text-ink">{topic.title}</h3>
            <p className="mt-1 text-sm text-muted">{topic.description}</p>
            <ul className="mt-2 space-y-1 text-sm text-body">
              {topic.examples.map((example) => (
                <li key={example}>&ldquo;{example}&rdquo;</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

const LINK = "font-medium text-accent hover:underline";

// Built on render, not at import: JSX at module scope breaks importing this file in tests.
const chatFaq = (): readonly FaqItem[] => [
  {
    question: "Am I talking to a person?",
    answer: (
      <p>
        No. The Workerra assistant is an AI. It can be wrong, so check anything important, such as pay rates,
        qualifications or employment rules, with the employer or an official source like GOV.UK.
      </p>
    ),
  },
  {
    question: "Can it search real vacancies or apply for me?",
    answer: (
      <p>
        Not yet. Live listings, applications and job alerts are still being built. The assistant links you to the{" "}
        <Link href="/jobs" className={LINK}>
          jobs page
        </Link>{" "}
        with your search filled in, and helps you get your CV and cover letter ready.
      </p>
    ),
  },
  {
    question: "What happens to my conversation?",
    answer: (
      <>
        <p>
          Your messages are sent to Workerra to generate each answer. The conversation is kept in this browser tab so it
          survives a refresh, and is cleared when you close the tab or start a new conversation.
        </p>
        <p>
          Don&rsquo;t share passwords, bank details or identity documents, and remove your phone number, email and address
          before pasting in your CV.
        </p>
      </>
    ),
  },
  {
    question: "I'm hiring. What goes into a good job brief?",
    answer: (
      <p>
        The job title, the main responsibilities, must-have and nice-to-have skills, location and working pattern (on-site,
        hybrid or remote), the salary band and the start date. Tell the assistant what you know and it will help fill the
        gaps and turn the brief into an advert.
      </p>
    ),
  },
  {
    question: "Can I speak to someone at Workerra?",
    answer: (
      <p>
        Ask the assistant to contact the team. Where a contact channel is set up, it gives you the details; where it
        isn&rsquo;t yet, it says so. You can also read more <Link href="/about" className={LINK}>about Workerra</Link>.
      </p>
    ),
  },
];

export function ChatFaq() {
  return <Faq id="chat-faq" items={chatFaq()} />;
}
