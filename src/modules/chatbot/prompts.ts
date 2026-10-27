import { JOURNEY_LIST } from "./journeys";
import type { SuggestedPrompt } from "./types";

/** One chip per journey: find a job, hire, create a profile, apply, contact the team. */
export const SUGGESTED_PROMPTS: readonly SuggestedPrompt[] = JOURNEY_LIST.map((j) => ({ label: j.label, prompt: j.starter }));

export const MAX_PROMPT_LENGTH = 2000;
/** Past messages sent with each request (the server enforces the same cap). */
export const MAX_HISTORY_MESSAGES = 10;

/** Builds the /chat URL that carries the user's first message. */
export function chatHref(prompt: string): string {
  const q = prompt.trim().slice(0, MAX_PROMPT_LENGTH);
  return q ? `/chat?q=${encodeURIComponent(q)}` : "/chat";
}
