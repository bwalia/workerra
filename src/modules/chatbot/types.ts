export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

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
}
