import { JOURNEYS, JOURNEY_LIST, actionsFor, detectJourney, detectJourneyIn, jobSearchHref, userText } from "../journeys";
import type { ChatReply, ChatTurn, JourneyId } from "../types";

// Built-in answers for when no LLM is configured (local development without
// NebulaDB, or a ring whose NebulaDB only has the mock model). Deterministic, so
// it is also what the tests pin. Be as honest as the system prompt: nothing here
// may promise a feature that is not live.

const GUIDES: Record<JourneyId, string> = {
  find_jobs: `Happy to help you find work. To point you at the right roles, tell me:
- the job title or kind of work you want
- where you'd like to work, or whether you want remote or hybrid
- full-time, part-time or contract, and the salary or day rate you're after

__JOBS__`,
  hire: `Great, let's get your hiring started. A good job brief covers:
- the job title and the 3 to 5 must-have skills
- location, or remote or hybrid
- salary band or day rate, contract type and start date
- how you'd like to screen candidates

__HIRE__`,
  candidate_profile: `A strong candidate profile helps the right employers find you. It should include:
- the roles you're aiming for and your key skills
- your experience, with one or two results you're proud of
- where you can work, your notice period and the salary you're after

Creating a profile and uploading a CV aren't live yet. You can paste your CV text here and I'll suggest improvements, but please remove your phone number, address and email first.`,
  apply: `__APPLY__`,
  contact: `The Workerra recruitment team can help with hiring and with finding work.`,
};

const CONTACT_NO_CHANNEL = `A direct contact channel for the team isn't set up on this site yet, so I can't pass on a message or share contact details. I can help with your hiring brief or your job search in the meantime.`;

// A message that only continues an earlier topic ("and in Leeds?") gets this
// instead of the whole guide again.
const FOLLOW_UP = `Thanks. Detailed answers need the AI assistant, which isn't switched on here yet, so I can only offer the guides and links. Pick a link below or choose another topic.`;
const FOLLOW_UP_SEARCH = `Thanks, I've turned that into a job search you can open below.`;

// Depends on whether this site has job listings switched on (OpsAPI configured).
const LIVE: Record<"jobs" | "hire" | "apply", Record<"live" | "notLive", string>> = {
  jobs: {
    live: `The jobs page searches every open vacancy on Workerra; open a job to see the details and apply.`,
    notLive: `Job listings aren't switched on for this site yet, so I can't show real vacancies. The jobs page will take your search as soon as they are.`,
  },
  hire: {
    live: `When you're ready, sign in on the recruiters page to post the job and read the applications it gets. Tell me about the role and I'll help you shape the brief and the advert first.`,
    notLive: `Posting jobs isn't switched on for this site yet. Tell me about the role and I'll help you shape the brief and the job advert so they're ready, or ask to talk to the recruitment team.`,
  },
  apply: {
    live: `Here's how applying works on Workerra:
- find a job you like and open its details
- fill in the form under "Apply for this job": your name, email, a cover letter and links to your CV or LinkedIn
- it goes straight to the recruiter, and you don't need an account

I can help you get ready first: tailor your CV to the job description, draft a cover letter, or prepare for an interview.`,
    notLive: `Applications aren't switched on for this site yet, so you can't apply through Workerra here today. I can help you get ready: tailor your CV to a job description, draft a cover letter, or prepare for an interview.`,
  },
};

function guideText(journey: JourneyId, jobsLive: boolean): string {
  const which = jobsLive ? "live" : "notLive";
  return GUIDES[journey]
    .replace("__JOBS__", LIVE.jobs[which])
    .replace("__HIRE__", LIVE.hire[which])
    .replace("__APPLY__", LIVE.apply[which]);
}

const WELCOME = `Hi, I'm the Workerra assistant. I can help you:
- find a job
- hire someone
- create your candidate profile
- apply for a job
- contact the recruitment team

What would you like to do?`;

export function guideReply(
  message: string,
  history: readonly ChatTurn[],
  { contactEmail, jobsLive = false }: { contactEmail: string | null; jobsLive?: boolean },
): ChatReply {
  const journey = detectJourney(message, history);
  if (!journey) {
    return {
      reply: WELCOME,
      mode: "guide",
      journey: null,
      actions: [],
      suggestions: JOURNEY_LIST.map((j) => j.starter),
    };
  }

  const followUp = detectJourneyIn(message) === null;
  const said = userText(message, history);
  const actions = actionsFor(journey, said, { contactEmail });
  let reply = guideText(journey, jobsLive);
  if (followUp) {
    reply = journey === "find_jobs" && jobSearchHref(said) !== "/jobs" ? FOLLOW_UP_SEARCH : FOLLOW_UP;
  }
  if (journey === "contact" && !followUp) {
    if (contactEmail) {
      reply += ` Email them at ${contactEmail} and say whether you're hiring or looking for work. Please don't send passwords, bank details or ID documents.`;
    } else {
      reply += ` ${CONTACT_NO_CHANNEL}`;
    }
  }

  return { reply, mode: "guide", journey, actions, suggestions: JOURNEYS[journey].suggestions };
}

