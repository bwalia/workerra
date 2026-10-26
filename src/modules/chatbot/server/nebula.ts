import type { ServerEnv } from "@/shared/config/env";

// NebulaDB AI chat client. Same service and call the JobShout recruiting dock
// uses (jobshout-com/web/nextjs/lib/job-support/nebuladb.ts → chat()): NebulaDB
// routes the request to the ring's LLM (cluster Ollama). See
// docs/chatbot-reference.md. Server only: the API key must never reach a browser.

export type NebulaConfig = NonNullable<ServerEnv["nebula"]>;

export interface NebulaChatRequest {
  system: string;
  message: string;
  temperature?: number;
  maxTokens?: number;
}

export interface NebulaChatResult {
  answer: string;
  model: string;
  provider: string;
}

export type AssistantErrorKind = "timeout" | "upstream" | "mock";

/** Failure talking to the AI backend. `message` is for logs, never for users. */
export class AssistantError extends Error {
  constructor(
    readonly kind: AssistantErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AssistantError";
  }
}

export const NEBULA_TIMEOUT_MS = 120_000;

export async function nebulaChat(
  config: NebulaConfig,
  req: NebulaChatRequest,
  { fetchImpl = fetch, timeoutMs = NEBULA_TIMEOUT_MS }: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<NebulaChatResult> {
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
  if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;

  let res: Response;
  try {
    res = await fetchImpl(`${config.url}/api/v1/ai/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: req.message,
        system: req.system,
        stream: false,
        temperature: req.temperature ?? 0.4,
        max_tokens: req.maxTokens ?? 1024,
      }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new AssistantError("timeout", `NebulaDB did not answer within ${timeoutMs}ms`);
    }
    throw new AssistantError("upstream", `NebulaDB unreachable: ${err instanceof Error ? err.message : String(err)}`);
  }

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new AssistantError("upstream", `NebulaDB ${res.status}: ${text.slice(0, 200)}`, res.status);
  }

  let body: { answer?: unknown; model?: unknown; provider?: unknown; is_mock?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    throw new AssistantError("upstream", "NebulaDB returned invalid JSON", res.status);
  }

  // NebulaDB falls back to a canned MockLlm when no LLM is configured. Never pass
  // that off as an assistant answer.
  if (body.is_mock === true) {
    throw new AssistantError("mock", "NebulaDB has no real LLM configured (is_mock=true)");
  }

  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  if (!answer) throw new AssistantError("upstream", "NebulaDB returned an empty answer", res.status);

  return {
    answer,
    model: typeof body.model === "string" ? body.model : "unknown",
    provider: typeof body.provider === "string" ? body.provider : "unknown",
  };
}
