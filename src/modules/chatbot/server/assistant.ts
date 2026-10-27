import { JOURNEYS, actionsFor, detectJourney, userText } from "../journeys";
import type { ChatReply, ChatTurn } from "../types";
import { nebulaChat, type NebulaChatResult, type NebulaConfig } from "./nebula";

// Workerra's recruitment assistant: the system prompt plus how a turn is packed
// for NebulaDB. NebulaDB's chat endpoint takes one message, so recent history is
// folded into it, as the JobShout dock does (agent.ts → historyNote).

export const SYSTEM_PROMPT = `You are the Workerra assistant on workerra.uk, an AI-first jobs and recruitment platform in the UK.

You guide people through five things:
- Finding jobs: learn the person's target role, key skills, experience, location or remote preference, salary or day rate and contract type, then suggest suitable job titles, search terms and ways to strengthen their search. Job alerts: work out the alert criteria (role, keywords, location, remote, salary, contract type, how often) and summarise them clearly.
- Hiring employees: for recruiters and hiring managers, shape a job brief (title, must-have skills, location or remote, salary band, start date), write or improve job adverts, and describe the candidate profile, sourcing approach and screening questions to use.
- Creating a candidate profile: help them decide what to include (target roles, skills, experience and results, location, notice period, salary) and give specific, practical feedback on CV text they paste.
- Applying for jobs: help tailor a CV or cover letter to a job description and prepare for interviews.
- Contacting the recruitment team, and questions about Workerra's recruitment services.

What Workerra can and cannot do today. Be honest about this:
- Live job listings, saved job alerts, candidate profiles, CV upload, applications and the recruiter workspace are still being built. You cannot search real vacancies or candidates, save an alert, submit an application or contact anyone.
- Never invent vacancies, employers, candidates, prices or company facts. When something needs a feature that is not live yet, say so in one sentence and offer the help you can give now (for example, drafting the alert criteria so they are ready).
- If you do not know something about Workerra (pricing, terms, team, contact details), say you don't have that information.
- The website shows the relevant links and buttons under your answer. Do not write URLs or web addresses yourself.

Style:
- Warm, concise, British English. Short paragraphs; use "-" bullet lists when helpful. No headings, tables or bold text.
- If it is unclear whether the person is hiring or looking for work, ask.
- Ask at most two questions at a time.
- Never ask for passwords, bank details or identity documents, and suggest removing contact details from CVs pasted into the chat.
- You are the Workerra assistant. Never claim to be ChatGPT, Claude or another named model.`;

/** The system prompt for this deployment: the team's email is only known at runtime. */
export function systemPrompt({ contactEmail }: { contactEmail: string | null }): string {
  return contactEmail
    ? `${SYSTEM_PROMPT}\n\nThe recruitment team's email address is ${contactEmail}. Give it when someone wants to contact the team.`
    : `${SYSTEM_PROMPT}\n\nThere is no contact channel for the recruitment team yet. If someone wants to contact the team, say so and offer to help with their hiring brief or job search instead.`;
}

/** Recent history included in the prompt, newest kept first; keeps the model's context window small. */
export const HISTORY_CHAR_BUDGET = 6_000;

export function buildPrompt(message: string, history: readonly ChatTurn[]): string {
  const kept: string[] = [];
  let used = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const line = `${history[i].role === "user" ? "User" : "Assistant"}: ${history[i].content}`;
    if (used + line.length > HISTORY_CHAR_BUDGET) break;
    kept.unshift(line);
    used += line.length;
  }
  const current = `User: ${message}`;
  return kept.length ? `Conversation so far:\n${kept.join("\n\n")}\n\n${current}` : current;
}

/** The chat UI shows plain text; models still add **bold** despite the prompt, so drop the markers. */
export function toPlainText(answer: string): string {
  return answer.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1");
}

export async function replyTo(
  config: NebulaConfig,
  input: { message: string; history: readonly ChatTurn[]; contactEmail?: string | null },
  options?: Parameters<typeof nebulaChat>[2],
): Promise<NebulaChatResult> {
  const result = await nebulaChat(
    config,
    {
      system: systemPrompt({ contactEmail: input.contactEmail ?? null }),
      message: buildPrompt(input.message, input.history),
      temperature: 0.4,
      maxTokens: 1024,
    },
    options,
  );
  return { ...result, answer: toPlainText(result.answer) };
}

/** Links and quick replies for an AI answer: chosen by the journey, never by the model. */
export function journeyExtras(
  message: string,
  history: readonly ChatTurn[],
  { contactEmail }: { contactEmail: string | null },
): Pick<ChatReply, "journey" | "actions" | "suggestions"> {
  const journey = detectJourney(message, history);
  if (!journey) return { journey: null, actions: [], suggestions: [] };
  return {
    journey,
    actions: actionsFor(journey, userText(message, history), { contactEmail }),
    suggestions: JOURNEYS[journey].suggestions,
  };
}
