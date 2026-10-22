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
