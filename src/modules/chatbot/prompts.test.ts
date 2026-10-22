import { describe, expect, it } from "vitest";
import { MAX_PROMPT_LENGTH, chatHref } from "./prompts";

describe("chatHref", () => {
  it("encodes the prompt", () => {
    expect(chatHref(" remote & hybrid ")).toBe("/chat?q=remote%20%26%20hybrid");
  });

  it("opens an empty chat for blank input", () => {
    expect(chatHref("   ")).toBe("/chat");
  });

  it("caps the prompt length", () => {
    const href = chatHref("a".repeat(MAX_PROMPT_LENGTH + 50));
    expect(decodeURIComponent(href.slice("/chat?q=".length))).toHaveLength(MAX_PROMPT_LENGTH);
  });
});
