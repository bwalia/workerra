import type { ModuleDescriptor } from "@/shared/modules";

export const chatbotModule: ModuleDescriptor = {
  id: "chatbot",
  name: "Workerra assistant",
  summary:
    "The main entry point: candidates and recruiters ask in plain language and the assistant routes them to jobs, profiles, applications and alerts. Backed by JobShout's agent platform.",
  basePath: "/chat",
  phase: 1,
  planned: [
    "Streaming conversation UI (ported from JobShout)",
    "Server-side proxy to the JobShout chat API",
    "Job search and alert intents",
    "Hand-off to sign-up, CV upload and applications",
  ],
};

export { ChatEntry } from "./components/ChatEntry";
export { MAX_PROMPT_LENGTH, SUGGESTED_PROMPTS, chatHref } from "./prompts";
export type * from "./types";
