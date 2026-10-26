import { describe, expect, it } from "vitest";
import { MAX_HISTORY_MESSAGES, MAX_PROMPT_LENGTH } from "../prompts";
import { MAX_HISTORY_CONTENT, parseChatRequest } from "./validation";

const parse = (body: unknown) => parseChatRequest(typeof body === "string" ? body : JSON.stringify(body));

describe("parseChatRequest", () => {
  it("accepts a message with history and trims it", () => {
    const result = parse({ message: "  hi  ", history: [{ role: "user", content: "earlier" }] });
    expect(result).toEqual({ ok: true, value: { message: "hi", history: [{ role: "user", content: "earlier" }] } });
  });

  it.each([
    ["invalid JSON", "{"],
    ["a non-object", "42"],
    ["a missing message", {}],
    ["a blank message", { message: "   " }],
    ["an over-long message", { message: "a".repeat(MAX_PROMPT_LENGTH + 1) }],
    ["non-array history", { message: "hi", history: "nope" }],
    ["a bad history role", { message: "hi", history: [{ role: "system", content: "x" }] }],
    ["non-string history content", { message: "hi", history: [{ role: "user", content: 1 }] }],
  ])("rejects %s", (_name, body) => {
    expect(parse(body).ok).toBe(false);
  });

  it("keeps only the most recent history, truncated", () => {
    const history = Array.from({ length: MAX_HISTORY_MESSAGES + 5 }, (_, i) => ({
      role: "assistant",
      content: `${i} ${"y".repeat(MAX_HISTORY_CONTENT)}`,
    }));
    const result = parse({ message: "hi", history });
    if (!result.ok) throw new Error(result.message);
    expect(result.value.history).toHaveLength(MAX_HISTORY_MESSAGES);
    expect(result.value.history[0].content.startsWith("5 ")).toBe(true);
    expect(result.value.history[0].content).toHaveLength(MAX_HISTORY_CONTENT);
  });
});
