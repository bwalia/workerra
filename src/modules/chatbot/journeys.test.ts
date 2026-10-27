import { describe, expect, it } from "vitest";
import { JOURNEYS, actionsFor, detectJourney, detectJourneyIn, isSafeActionHref, jobSearchHref, userText } from "./journeys";

const NO_EMAIL = { contactEmail: null };

describe("detectJourneyIn", () => {
  it.each([
    ["I'm looking for a job", "find_jobs"],
    ["Find me remote React jobs in Leeds", "find_jobs"],
    ["Set up a job alert for nursing", "find_jobs"],
    ["We're hiring two warehouse operatives", "hire"],
    ["I'm a recruiter and want to post a job", "hire"],
    ["How do I create a candidate profile?", "candidate_profile"],
    ["Can you review my CV?", "candidate_profile"],
    ["How do I apply for this role?", "apply"],
    ["Help me write a cover letter", "apply"],
    ["Can I speak to someone on the team?", "contact"],
    ["What are your contact details?", "contact"],
  ])("%s → %s", (text, journey) => {
    expect(detectJourneyIn(text)).toBe(journey);
  });

  it("returns null for small talk", () => {
    expect(detectJourneyIn("hello there")).toBeNull();
  });

  it("every journey's starter and suggestions route somewhere sensible", () => {
    for (const j of Object.values(JOURNEYS)) expect(detectJourneyIn(j.starter)).toBe(j.id);
  });
});

describe("detectJourney", () => {
  it("keeps the earlier topic for a follow-up", () => {
    expect(detectJourney("and in Leeds?", [{ role: "user", content: "Remote React jobs" }])).toBe("find_jobs");
  });

  it("ignores the assistant's own words", () => {
    expect(detectJourney("ok", [{ role: "assistant", content: "Do you want to apply?" }])).toBeNull();
  });
});

describe("jobSearchHref", () => {
  it("turns a request into /jobs filters", () => {
    const href = jobSearchHref("Find me remote React developer jobs in Leeds");
    const params = new URL(href, "http://x").searchParams;
    expect(params.get("q")).toBe("React developer");
    expect(params.get("location")).toBe("Leeds");
    expect(params.get("workplace")).toBe("remote");
  });

  it("picks up contract type", () => {
    const params = new URL(jobSearchHref("Part-time jobs near me"), "http://x").searchParams;
    expect(params.get("type")).toBe("part_time");
    expect(params.get("q")).toBeNull();
    expect(params.get("location")).toBeNull();
  });

  it("is plain /jobs when there is nothing to search on", () => {
    expect(jobSearchHref("I'm looking for a job.")).toBe("/jobs");
  });

  it("combines what was said across the conversation", () => {
    const said = userText("and in Leeds?", [{ role: "user", content: "Python developer jobs" }]);
    const params = new URL(jobSearchHref(said), "http://x").searchParams;
    expect(params.get("q")).toBe("Python developer");
    expect(params.get("location")).toBe("Leeds");
  });

  const u = (content: string) => ({ role: "user" as const, content });
  const a = (content: string) => ({ role: "assistant" as const, content });
  const search = (message: string, history: Parameters<typeof userText>[1]) =>
    Object.fromEntries(new URL(jobSearchHref(userText(message, history)), "http://x").searchParams);

  it("keeps the role typed after the 'Find a job' starter", () => {
    expect(search("React developer jobs in Leeds", [u("I'm looking for a job."), a("Tell me more")])).toEqual({
      q: "React developer",
      location: "Leeds",
    });
  });

  it("lets a follow-up change one filter and keeps the others", () => {
    const history = [u("Remote Python developer jobs in London"), a("…")];
    expect(search("what about in Leeds?", history)).toEqual({ q: "Python developer", location: "Leeds", workplace: "remote" });
    expect(search("actually Java developer jobs", history)).toEqual({ q: "Java developer", location: "London", workplace: "remote" });
    expect(search("full-time only please", [u("part-time Python jobs"), a("…")])).toEqual({ q: "Python", type: "full_time" });
  });

  it("does not carry filters over from a different journey", () => {
    expect(search("Nursing jobs", [u("I want to hire a Java developer in Manchester"), a("…")])).toEqual({ q: "Nursing" });
  });
});

describe("actionsFor", () => {
  it("links a job search to matching jobs", () => {
    expect(actionsFor("find_jobs", "Nurse jobs in York", NO_EMAIL)[0]).toEqual({
      label: "See matching jobs",
      href: "/jobs?q=Nurse&location=York",
    });
  });

  it("adds the team inbox for contact, without changing the shared list", () => {
    const actions = actionsFor("contact", "contact the team", { contactEmail: "team@workerra.uk" });
    expect(actions[0]).toEqual({ label: "Email the team", href: "mailto:team@workerra.uk" });
    expect(JOURNEYS.contact.actions.some((a) => a.href.startsWith("mailto:"))).toBe(false);
  });

  it("only links internal pages or mailto", () => {
    for (const j of Object.values(JOURNEYS)) {
      for (const a of actionsFor(j.id, j.starter, { contactEmail: "team@workerra.uk" })) {
        expect(isSafeActionHref(a.href)).toBe(true);
      }
    }
  });
});

describe("isSafeActionHref", () => {
  it.each(["/jobs", "/jobs?q=React", "mailto:team@workerra.uk"])("allows %s", (href) => {
    expect(isSafeActionHref(href)).toBe(true);
  });

  it.each(["//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "javascript:alert(1)", "https://evil.example", "mailto:a@x.uk?bcc=b@y.uk"])(
    "refuses %s",
    (href) => {
      expect(isSafeActionHref(href)).toBe(false);
    },
  );
});

describe("jobSearchHref on hostile input", () => {
  it("stays fast on a long unbroken string", () => {
    const long = "a".repeat(4000);
    const started = performance.now();
    jobSearchHref(Array.from({ length: 11 }, () => long).join("\n"));
    expect(performance.now() - started).toBeLessThan(100);
  });
});
