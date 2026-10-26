import type { SuggestedPrompt } from "./types";

export const SUGGESTED_PROMPTS: readonly SuggestedPrompt[] = [
  { label: "Find jobs for me", prompt: "Find jobs that match my skills and experience." },
  { label: "Improve my CV", prompt: "Review my CV and suggest improvements." },
  { label: "Set up a job alert", prompt: "Alert me when new remote software jobs are posted." },
  { label: "I'm hiring", prompt: "I'm a recruiter and want to post a job." },
];

export const MAX_PROMPT_LENGTH = 2000;
/** Past messages sent with each request (the server enforces the same cap). */
export const MAX_HISTORY_MESSAGES = 10;

/** Builds the /chat URL that carries the user's first message. */
export function chatHref(prompt: string): string {
  const q = prompt.trim().slice(0, MAX_PROMPT_LENGTH);
  return q ? `/chat?q=${encodeURIComponent(q)}` : "/chat";
}
