export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  /** Assistant messages only: links and quick replies shown under the answer. */
  actions?: ChatAction[];
  suggestions?: string[];
}

/** The five journeys the assistant guides people through (see journeys.ts). */
export type JourneyId = "find_jobs" | "hire" | "candidate_profile" | "apply" | "contact";

/** A link the assistant offers under an answer. Internal paths or mailto: only. */
export interface ChatAction {
  label: string;
  href: string;
}

/**
 * "ai": answers come from the LLM (NebulaDB). "guide": no LLM is configured, so
 * Workerra answers from its built-in guides. Local development needs no secrets.
 */
export type AssistantMode = "ai" | "guide";

/** Shortcut the home page offers; the prompt is sent to the assistant as-is. */
export interface SuggestedPrompt {
  label: string;
  prompt: string;
}

/** A past message sent with each request so the assistant has context. */
export interface ChatTurn {
  role: ChatRole;
  content: string;
}

/** Body of POST /api/chat. */
export interface ChatRequest {
  message: string;
  history?: ChatTurn[];
}

/** `data` of a successful POST /api/chat. */
export interface ChatReply {
  reply: string;
  mode: AssistantMode;
  journey: JourneyId | null;
  actions: ChatAction[];
  suggestions: string[];
}
