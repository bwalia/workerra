import type { ChatAction, ChatTurn, JourneyId } from "./types";

// The five things people come to Workerra for. Detection is deterministic so the
// links and quick replies the assistant offers never depend on what the model
// says: the model writes the answer, these decide where it can take you next.

export interface Journey {
  id: JourneyId;
  /** Chip label on the home page and in an empty chat. */
  label: string;
  /** Message sent when the chip is clicked. */
  starter: string;
  keywords: RegExp;
  actions: ChatAction[];
  /** Follow-up messages offered as quick replies. */
  suggestions: string[];
}

export const JOURNEYS: Record<JourneyId, Journey> = {
  find_jobs: {
    id: "find_jobs",
    label: "Find a job",
    starter: "I'm looking for a job.",
    keywords:
      /\b(find|looking for|search(ing)?|want|need)\b.{0,40}\b(job|jobs|work|role|roles|position|vacanc\w*|contract)\b|\b(jobs?|vacanc\w*|roles?) (in|near|for|as)\b|\bjob ?hunt\w*|\bjob alerts?\b|\b(jobs|vacanc\w*|careers?)\b/i,
    actions: [
      { label: "Browse jobs", href: "/jobs" },
      { label: "Set up a job alert", href: "/alerts" },
    ],
    suggestions: ["Remote software jobs", "Part-time jobs near me", "How do job alerts work?"],
  },
  hire: {
    id: "hire",
    label: "Hire someone",
    starter: "I want to hire someone.",
    keywords:
      /\b(hir(e|ing)|recruit(ing|er|ment)?|post (a )?(job|vacancy|role)|job (ad|advert|brief)|candidates? for|shortlist|staff(ing)?|employers?)\b/i,
    actions: [
      { label: "For recruiters", href: "/recruiters" },
      { label: "Hiring pipeline", href: "/recruiters/pipeline" },
    ],
    suggestions: ["Help me write a job advert", "What should a job brief include?", "Talk to the recruitment team"],
  },
  candidate_profile: {
    id: "candidate_profile",
    label: "Create my profile",
    starter: "I want to create a candidate profile.",
    keywords: /\b(profile|sign ?up|register|create (an )?account|cv|resume|résumé)\b/i,
    actions: [{ label: "Candidate profiles", href: "/candidates" }],
    suggestions: ["What should my profile include?", "Review my CV", "Now help me find jobs"],
  },
  apply: {
    id: "apply",
    label: "Apply for a job",
    starter: "How do I apply for a job?",
    keywords: /\b(apply|applying|application|applications|cover letter|interview)\b/i,
    actions: [
      { label: "My applications", href: "/applications" },
      { label: "Browse jobs", href: "/jobs" },
    ],
    suggestions: ["Help me write a cover letter", "Tailor my CV to a job", "Prepare for an interview"],
  },
  contact: {
    id: "contact",
    label: "Contact the team",
    starter: "I'd like to contact the Workerra recruitment team.",
    keywords:
      /\b(contact|speak|talk|call|phone|email|e-mail|reach|get in touch)\b.{0,30}\b(team|someone|person|human|recruiter|you|workerra|support)\b|\b(human|real person|customer service|support team|contact (details|us))\b/i,
    actions: [{ label: "About Workerra", href: "/about" }],
    suggestions: ["I'm hiring", "I'm looking for work"],
  },
};

/** Checked in this order: the more specific intents win over "find a job". */
const DETECTION_ORDER: readonly JourneyId[] = ["contact", "apply", "hire", "candidate_profile", "find_jobs"];

export const JOURNEY_LIST: readonly Journey[] = (
  ["find_jobs", "hire", "candidate_profile", "apply", "contact"] as const
).map((id) => JOURNEYS[id]);

export function detectJourneyIn(text: string): JourneyId | null {
  return DETECTION_ORDER.find((id) => JOURNEYS[id].keywords.test(text)) ?? null;
}

/**
 * The journey this turn belongs to: the message's own, else the most recent one
 * the person raised earlier ("and in Leeds?" stays a job search).
 */
export function detectJourney(message: string, history: readonly ChatTurn[] = []): JourneyId | null {
  const own = detectJourneyIn(message);
  if (own) return own;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== "user") continue;
    const earlier = detectJourneyIn(history[i].content);
    if (earlier) return earlier;
  }
  return null;
}

const WORKPLACE_WORDS: Record<string, string> = { remote: "remote", hybrid: "hybrid", "on-site": "onsite", onsite: "onsite", "in office": "onsite" };
const TYPE_WORDS: Record<string, string> = {
  "full-time": "full_time",
  "full time": "full_time",
  "part-time": "part_time",
  "part time": "part_time",
  contract: "contract",
  temporary: "temporary",
  temp: "temporary",
  internship: "internship",
};

const ROLE_NOISE =
  /\b(remote|hybrid|on-?site|full[- ]time|part[- ]time|contract|temporary|temp|internship|any|some|new|latest|good|local|find|show|get|help|please|now|me|my|i'?m|i|a|an|the|for|of|looking|want|need|search(ing)?|actually|instead|what|about|how)\b/gi;

/** The /jobs filters one message mentions, e.g. "remote React jobs in Leeds". */
function jobFilters(text: string): Record<string, string> {
  const lower = text.toLowerCase();
  const filters: Record<string, string> = {};

  // Up to four words right before "jobs"/"roles": "remote React developer jobs".
  // The last mention with a real role wins ("I'm looking for a job. React jobs").
  // Word length is capped so a long unbroken string can't make this quadratic.
  const roles = Array.from(
    text.matchAll(/((?:[\w'+#.-]{1,40}[ \t]+){0,3}[\w'+#.-]{1,40})[ \t]+(?:jobs?|roles?|positions?|vacancies)\b/gi),
  );
  for (const [, role] of roles) {
    const cleaned = role.replace(ROLE_NOISE, " ").replace(/\s+/g, " ").trim();
    if (cleaned) filters.q = cleaned;
  }

  const location = text.match(/\b(?:in|near|around)[ \t]+([A-Z][A-Za-z'-]+(?:[ \t]+[A-Z][A-Za-z'-]+)?)/)?.[1];
  if (location) filters.location = location;

  const workplace = Array.from(new Set(Object.entries(WORKPLACE_WORDS).filter(([w]) => lower.includes(w)).map(([, v]) => v)));
  if (workplace.length) filters.workplace = workplace.join(",");
  const types = Array.from(new Set(Object.entries(TYPE_WORDS).filter(([w]) => new RegExp(`\\b${w}\\b`).test(lower)).map(([, v]) => v)));
  if (types.length) filters.type = types.join(",");
  return filters;
}

/**
 * Builds a /jobs search link from what the person typed. Given several messages
 * (oldest first), each filter keeps its latest value: "Python jobs in London"
 * then "what about in Leeds?" searches Python in Leeds.
 */
export function jobSearchHref(said: string | readonly string[]): string {
  const merged: Record<string, string> = {};
  for (const text of typeof said === "string" ? [said] : said) Object.assign(merged, jobFilters(text));
  const params = new URLSearchParams();
  for (const key of ["q", "location", "workplace", "type"]) if (merged[key]) params.set(key, merged[key]);
  const query = params.toString();
  return query ? `/jobs?${query}` : "/jobs";
}

/**
 * Hrefs the chat may render: same-site paths (not protocol-relative "//host") or mailto:.
 * No whitespace or control characters: browsers drop tabs and newlines, so "/\t/host" is "//host".
 */
export function isSafeActionHref(href: string): boolean {
  return /^\/(?![\/\\])[^\s\x00-\x1f\x7f]*$/.test(href) || /^mailto:[^\s\x00-\x1f\x7f?&]+$/.test(href);
}

/**
 * What the person has said in the current topic, oldest first, so "and in Leeds?"
 * keeps the earlier role. Stops at the last message that raised a different journey,
 * so a hiring brief's location doesn't leak into a later job search.
 */
export function userText(message: string, history: readonly ChatTurn[]): string[] {
  const journey = detectJourney(message, history);
  const said = [message];
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== "user") continue;
    const own = detectJourneyIn(history[i].content);
    if (own && own !== journey) break;
    said.unshift(history[i].content);
  }
  return said;
}

/**
 * Links offered for a journey. A job search carries the person's own filters
 * (`said` is everything they've said); contact gets the team's inbox when one is configured.
 */
export function actionsFor(journey: JourneyId, said: string | readonly string[], { contactEmail }: { contactEmail: string | null }): ChatAction[] {
  const actions = [...JOURNEYS[journey].actions];
  if (journey === "find_jobs") {
    const search = jobSearchHref(said);
    if (search !== "/jobs") actions[0] = { label: "See matching jobs", href: search };
  }
  if (journey === "contact" && contactEmail) actions.unshift({ label: "Email the team", href: `mailto:${contactEmail}` });
  return actions;
}
