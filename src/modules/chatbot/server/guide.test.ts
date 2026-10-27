import { describe, expect, it } from "vitest";
import { guideReply } from "./guide";

const NO_EMAIL = { contactEmail: null };

describe("guideReply", () => {
  it("welcomes with the five journeys when the topic is unclear", () => {
    const r = guideReply("hello", [], NO_EMAIL);
    expect(r).toMatchObject({ mode: "guide", journey: null, actions: [] });
    expect(r.suggestions).toHaveLength(5);
  });

  it.each(["find_jobs", "hire", "candidate_profile", "apply"] as const)("is honest that %s is not live yet", (journey) => {
    const starters = {
      find_jobs: "I'm looking for a job.",
      hire: "I want to hire someone.",
      candidate_profile: "I want to create a candidate profile.",
      apply: "How do I apply for a job?",
    };
    const r = guideReply(starters[journey], [], NO_EMAIL);
    expect(r.journey).toBe(journey);
    expect(r.reply).toMatch(/aren't live yet|still being (built|added)/);
    expect(r.actions.length).toBeGreaterThan(0);
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it("does not invent a contact channel when none is configured", () => {
    const r = guideReply("I'd like to contact the Workerra recruitment team.", [], NO_EMAIL);
    expect(r.journey).toBe("contact");
    expect(r.reply).toContain("isn't set up");
    expect(r.reply).not.toMatch(/@/);
    expect(r.actions.some((a) => a.href.startsWith("mailto:"))).toBe(false);
  });

  it("offers the configured team inbox", () => {
    const r = guideReply("Can I talk to someone at Workerra?", [], { contactEmail: "team@workerra.uk" });
    expect(r.reply).toContain("team@workerra.uk");
    expect(r.actions[0].href).toBe("mailto:team@workerra.uk");
  });

  it("answers a follow-up briefly and keeps building the search", () => {
    const r = guideReply("and in Leeds?", [{ role: "user", content: "Remote React jobs" }], NO_EMAIL);
    expect(r.journey).toBe("find_jobs");
    expect(r.reply).toContain("job search");
    expect(r.actions[0].href).toBe("/jobs?q=React&location=Leeds&workplace=remote");
  });
});
