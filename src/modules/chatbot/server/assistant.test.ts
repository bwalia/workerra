import { describe, expect, it } from "vitest";
import { HISTORY_CHAR_BUDGET, SYSTEM_PROMPT, buildPrompt, systemPrompt, toPlainText } from "./assistant";

describe("buildPrompt", () => {
  it("sends just the message when there is no history", () => {
    expect(buildPrompt("Find me a job", [])).toBe("User: Find me a job");
  });

  it("folds history in, oldest first", () => {
    const prompt = buildPrompt("And in Leeds?", [
      { role: "user", content: "Remote React jobs" },
      { role: "assistant", content: "Which salary range?" },
    ]);
    expect(prompt).toBe(
      "Conversation so far:\nUser: Remote React jobs\n\nAssistant: Which salary range?\n\nUser: And in Leeds?",
    );
  });

  it("drops the oldest history beyond the character budget", () => {
    const long = "x".repeat(HISTORY_CHAR_BUDGET / 2);
    const prompt = buildPrompt("latest", [
      { role: "user", content: `first ${long}` },
      { role: "assistant", content: `second ${long}` },
      { role: "user", content: "third" },
    ]);
    expect(prompt).not.toContain("first");
    expect(prompt).toContain("second");
    expect(prompt).toContain("third");
  });
});

describe("toPlainText", () => {
  it("drops bold markers but keeps bullets and line breaks", () => {
    expect(toPlainText("- **Location:** Manchester\n- __Salary__: £55k")).toBe("- Location: Manchester\n- Salary: £55k");
  });
});

describe("SYSTEM_PROMPT", () => {
  it("covers the five journeys and forbids invented listings and URLs", () => {
    for (const topic of [
      "Finding jobs",
      "Hiring employees",
      "Creating a candidate profile",
      "Applying for jobs",
      "Contacting the recruitment team",
      "Never invent",
      "Do not write URLs",
    ]) {
      expect(SYSTEM_PROMPT).toContain(topic);
    }
  });
});

describe("systemPrompt", () => {
  it("gives the team inbox only when one is configured", () => {
    expect(systemPrompt({ contactEmail: "team@workerra.uk" })).toContain("team@workerra.uk");
    expect(systemPrompt({ contactEmail: null })).toContain("no contact channel");
  });
});
