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

/** Builds a /jobs search link from what the person typed, e.g. "remote React jobs in Leeds". */
export function jobSearchHref(text: string): string {
  const lower = text.toLowerCase();
  const params = new URLSearchParams();

  // Up to four words right before "jobs"/"roles": "remote React developer jobs".
  // Word length is capped so a long unbroken string can't make this quadratic.
  const role = text.match(
    /((?:[\w'+#.-]{1,40}[ \t]+){0,3}[\w'+#.-]{1,40})[ \t]+(?:jobs?|roles?|positions?|vacancies)\b/i,
  )?.[1];
  if (role) {
    const cleaned = role
      .replace(
        /\b(remote|hybrid|on-?site|full[- ]time|part[- ]time|contract|temporary|temp|internship|any|some|new|latest|good|local|find|show|get|help|please|now|me|my|i'?m|i|a|an|the|for|of|looking|want|need|search(ing)?)\b/gi,
        " ",
      )
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned) params.set("q", cleaned);
  }

  const location = text.match(/\b(?:in|near|around)[ \t]+([A-Z][A-Za-z'-]+(?:[ \t]+[A-Z][A-Za-z'-]+)?)/)?.[1];
  if (location) params.set("location", location);

  const workplace = Array.from(new Set(Object.entries(WORKPLACE_WORDS).filter(([w]) => lower.includes(w)).map(([, v]) => v)));
  if (workplace.length) params.set("workplace", workplace.join(","));
  const types = Array.from(new Set(Object.entries(TYPE_WORDS).filter(([w]) => new RegExp(`\\b${w}\\b`).test(lower)).map(([, v]) => v)));
  if (types.length) params.set("type", types.join(","));

  const query = params.toString();
  return query ? `/jobs?${query}` : "/jobs";
}

/** Hrefs the chat may render: same-site paths (not protocol-relative "//host") or mailto:. */
export function isSafeActionHref(href: string): boolean {
  return /^\/(?![\/\\])/.test(href) || /^mailto:[^\s?&]+$/.test(href);
}

/** Everything the person has said this conversation, so "and in Leeds?" keeps the earlier role. */
export function userText(message: string, history: readonly ChatTurn[]): string {
  return [...history.filter((t) => t.role === "user").map((t) => t.content), message].join("\n");
}

/**
 * Links offered for a journey. A job search carries the person's own filters
 * (`said` is everything they've said); contact gets the team's inbox when one is configured.
 */
export function actionsFor(journey: JourneyId, said: string, { contactEmail }: { contactEmail: string | null }): ChatAction[] {
  const actions = [...JOURNEYS[journey].actions];
  if (journey === "find_jobs") {
    const search = jobSearchHref(said);
    if (search !== "/jobs") actions[0] = { label: "See matching jobs", href: search };
  }
  if (journey === "contact" && contactEmail) actions.unshift({ label: "Email the team", href: `mailto:${contactEmail}` });
  return actions;
}
