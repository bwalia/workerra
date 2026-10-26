import { fail, ok } from "@/shared/api";
import { loadServerEnv } from "@/shared/config/env";
import { logger } from "@/shared/logging";
import type { ChatReply } from "../types";
import { replyTo } from "./assistant";
import { AssistantError, type AssistantErrorKind } from "./nebula";
import { clientKey, createRateLimiter } from "./rate-limit";
import { MAX_BODY_CHARS, parseChatRequest } from "./validation";

// POST /api/chat. Logs carry sizes, timings and model only, never message text.

const log = logger.child({ module: "chatbot" });
const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

const UNAVAILABLE = "The assistant couldn't answer just now. Please try again in a moment.";
const ERRORS: Record<AssistantErrorKind, [status: number, code: string, message: string]> = {
  timeout: [504, "assistant_timeout", "The assistant took too long to answer. Please try again."],
  upstream: [502, "assistant_unavailable", UNAVAILABLE],
  mock: [503, "assistant_offline", UNAVAILABLE],
};

export function assistantEnabled(): boolean {
  return loadServerEnv().nebula !== null;
}

export async function handleChatPost(req: Request): Promise<Response> {
  const nebula = loadServerEnv().nebula;
  if (!nebula) {
    return fail(503, "assistant_offline", "The Workerra assistant is offline right now. Please try again later.");
  }

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

  const started = Date.now();
  const sizes = { messageChars: parsed.value.message.length, historyTurns: parsed.value.history.length };
  try {
    const result = await replyTo(nebula, parsed.value);
    log.info("assistant replied", { ...sizes, ms: Date.now() - started, model: result.model, provider: result.provider });
    return ok<ChatReply>({ reply: result.answer }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (!(err instanceof AssistantError)) throw err;
    log.error("assistant failed", { ...sizes, ms: Date.now() - started, kind: err.kind, status: err.status, error: err });
    const [status, code, message] = ERRORS[err.kind];
    return fail(status, code, message);
  }
}
