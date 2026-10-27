import { fail, ok } from "@/shared/api";
import { loadServerEnv } from "@/shared/config/env";
import { logger } from "@/shared/logging";
import type { AssistantMode, ChatReply } from "../types";
import { journeyExtras, replyTo } from "./assistant";
import { guideReply } from "./guide";
import { AssistantError, type AssistantErrorKind } from "./nebula";
import { clientKey, createRateLimiter } from "./rate-limit";
import { MAX_BODY_CHARS, parseChatRequest } from "./validation";

// POST /api/chat. Answers from the LLM when NebulaDB is configured, otherwise
// from the built-in guides (guide.ts), so local development needs no secrets.
// Logs carry sizes, timings and model only, never message text.

const log = logger.child({ module: "chatbot" });
const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

const UNAVAILABLE = "The assistant couldn't answer just now. Please try again in a moment.";
const ERRORS: Record<AssistantErrorKind, [status: number, code: string, message: string]> = {
  timeout: [504, "assistant_timeout", "The assistant took too long to answer. Please try again."],
  upstream: [502, "assistant_unavailable", UNAVAILABLE],
  mock: [503, "assistant_offline", UNAVAILABLE], // unused: a mock LLM falls back to the guide
};

const NO_STORE = { headers: { "cache-control": "no-store" } };

/** "guide" when no LLM is configured: the assistant still answers, from its built-in guides. */
export function assistantMode(): AssistantMode {
  return loadServerEnv().nebula ? "ai" : "guide";
}

export async function handleChatPost(req: Request): Promise<Response> {
  const { nebula, contactEmail } = loadServerEnv();

  const limit = limiter.check(clientKey(req.headers));
  if (!limit.allowed) {
    return fail(429, "rate_limited", "You're sending messages too quickly. Please wait a moment.", {
      headers: { "retry-after": String(limit.retryAfterSeconds) },
    });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS) return fail(413, "payload_too_large", "That message is too long.");
  const parsed = parseChatRequest(raw);
  if (!parsed.ok) return fail(400, "invalid_request", parsed.message);

  const { message, history } = parsed.value;
  const sizes = { messageChars: message.length, historyTurns: history.length };
  const guided = () => ok<ChatReply>(guideReply(message, history, { contactEmail }), NO_STORE);
  if (!nebula) return guided();

  const started = Date.now();
  try {
    const result = await replyTo(nebula, { message, history, contactEmail });
    log.info("assistant replied", { ...sizes, ms: Date.now() - started, model: result.model, provider: result.provider });
    return ok<ChatReply>(
      { reply: result.answer, mode: "ai", ...journeyExtras(message, history, { contactEmail }) },
      NO_STORE,
    );
  } catch (err) {
    if (!(err instanceof AssistantError)) throw err;
    // A NebulaDB with only its mock model (common locally) is as good as none: guide instead.
    if (err.kind === "mock") {
      log.warn("assistant has only a mock LLM; answering from the guide", { ...sizes });
      return guided();
    }
    log.error("assistant failed", { ...sizes, ms: Date.now() - started, kind: err.kind, status: err.status, error: err });
    const [status, code, message] = ERRORS[err.kind];
    return fail(status, code, message);
  }
}
