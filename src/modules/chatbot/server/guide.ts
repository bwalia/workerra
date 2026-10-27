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

Live job listings are still being added to Workerra, so I can't show real vacancies yet. The jobs page will take your search as soon as they're there, and a job alert will let us tell you when something matching comes in.`,
  hire: `Great, let's get your hiring started. A good job brief covers:
- the job title and the 3 to 5 must-have skills
- location, or remote or hybrid
- salary band or day rate, contract type and start date
- how you'd like to screen candidates

Posting jobs and the recruiter workspace are still being built. Tell me about the role and I'll help you shape the brief and the job advert so they're ready, or ask to talk to the recruitment team.`,
  candidate_profile: `A strong candidate profile helps the right employers find you. It should include:
- the roles you're aiming for and your key skills
- your experience, with one or two results you're proud of
- where you can work, your notice period and the salary you're after

Creating a profile and uploading a CV aren't live yet. You can paste your CV text here and I'll suggest improvements, but please remove your phone number, address and email first.`,
  apply: `Here's how applying will work on Workerra:
- find a job you like and open its details
- apply with your profile and CV, adding a short cover note
- follow each application's progress from your applications page

Applications aren't live yet, so you can't apply through Workerra today. I can help you get ready: tailor your CV to a job description, draft a cover letter, or prepare for an interview.`,
  contact: `The Workerra recruitment team can help with hiring and with finding work.`,
};

const CONTACT_NO_CHANNEL = `A direct contact channel for the team isn't set up on this site yet, so I can't pass on a message or share contact details. I can help with your hiring brief or your job search in the meantime.`;

// A message that only continues an earlier topic ("and in Leeds?") gets this
// instead of the whole guide again.
const FOLLOW_UP = `Thanks. Detailed answers need the AI assistant, which isn't switched on here yet, so I can only offer the guides and links. Pick a link below or choose another topic.`;
const FOLLOW_UP_SEARCH = `Thanks, I've turned that into a job search you can open below. Listings are still being added, so it may be empty for now.`;

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
  { contactEmail }: { contactEmail: string | null },
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
  let reply = GUIDES[journey];
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

