import type { ModuleDescriptor } from "@/shared/modules";

export const chatbotModule: ModuleDescriptor = {
  id: "chatbot",
  name: "Workerra assistant",
  summary:
    "The main entry point: candidates and recruiters ask in plain language and the assistant routes them to jobs, profiles, applications and alerts. Backed by JobShout's agent platform.",
  basePath: "/chat",
  phase: 1,
  planned: [
    "Job and candidate matching once listings and profiles exist",
    "Saving job alerts from the conversation",
    "Sign-up, CV upload and applying from the conversation",
    "Sending contact requests to the recruitment team (OpsAPI CRM)",
  ],
};

export { ChatEntry } from "./components/ChatEntry";
export { ChatPanel } from "./components/ChatPanel";
export { JOURNEYS, JOURNEY_LIST, detectJourney, jobSearchHref } from "./journeys";
export { MAX_HISTORY_MESSAGES, MAX_PROMPT_LENGTH, SUGGESTED_PROMPTS, chatHref } from "./prompts";
export type * from "./types";
