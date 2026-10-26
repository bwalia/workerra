import { describe, expect, it } from "vitest";
import { HISTORY_CHAR_BUDGET, SYSTEM_PROMPT, buildPrompt, toPlainText } from "./assistant";

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
  it("covers each job the assistant is for and forbids invented listings", () => {
    for (const topic of ["jobs", "CV", "job alerts", "Recruiters", "Workerra's recruitment services", "Never invent"]) {
      expect(SYSTEM_PROMPT).toContain(topic);
    }
  });
});
