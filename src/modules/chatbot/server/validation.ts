import { MAX_HISTORY_MESSAGES, MAX_PROMPT_LENGTH } from "../prompts";
import type { ChatTurn } from "../types";

// Validates POST /api/chat bodies. History comes from the browser, so it is
// untrusted: shape-checked, capped in count and length.

export const MAX_BODY_CHARS = 64_000;
/** Assistant replies run longer than user prompts. */
export const MAX_HISTORY_CONTENT = 4_000;

export type ParsedChatRequest = { ok: true; value: { message: string; history: ChatTurn[] } } | { ok: false; message: string };

export function parseChatRequest(raw: string): ParsedChatRequest {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, message: "Request body must be JSON." };
  }
  if (!body || typeof body !== "object") return { ok: false, message: "Request body must be a JSON object." };
  const { message, history } = body as { message?: unknown; history?: unknown };

  if (typeof message !== "string" || !message.trim()) return { ok: false, message: "Please type a message." };
  if (message.length > MAX_PROMPT_LENGTH) {
    return { ok: false, message: `Messages can be up to ${MAX_PROMPT_LENGTH} characters.` };
  }

  if (history !== undefined && !Array.isArray(history)) return { ok: false, message: "history must be an array." };
  const turns: ChatTurn[] = [];
  for (const item of (history ?? []) as unknown[]) {
    const { role, content } = (item ?? {}) as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      return { ok: false, message: "history entries need a role of user or assistant and string content." };
    }
    if (content.trim()) turns.push({ role, content: content.trim().slice(0, MAX_HISTORY_CONTENT) });
  }

  return { ok: true, value: { message: message.trim(), history: turns.slice(-MAX_HISTORY_MESSAGES) } };
}
