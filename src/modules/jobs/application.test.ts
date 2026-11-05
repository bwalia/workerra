import { describe, expect, it } from "vitest";
import { parseApplication } from "./application";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

describe("parseApplication", () => {
  it("trims, lower-cases the email and leaves out empty optional fields", () => {
    expect(parseApplication(form({ name: "  Jo Bloggs ", email: " Jo@Example.com ", phone: " ", cover_letter: "" }))).toEqual({
      ok: true,
      application: { name: "Jo Bloggs", email: "jo@example.com" },
    });
  });

  it("splits links on whitespace and keeps the rest", () => {
    const r = parseApplication(
      form({ name: "Jo", email: "jo@example.com", phone: "07700 900123", cover_letter: "Hi", links: "https://a.example/cv\nhttp://b.example" }),
    );
    expect(r).toEqual({
      ok: true,
      application: { name: "Jo", email: "jo@example.com", phone: "07700 900123", cover_letter: "Hi", links: ["https://a.example/cv", "http://b.example"] },
    });
  });

  it("explains each problem by field", () => {
    const r = parseApplication(form({ name: "", email: "nope", links: "javascript:alert(1)" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["email", "links", "name"]);
  });

  it("limits the number of links and the cover letter's length", () => {
    const six = Array.from({ length: 6 }, (_, i) => `https://x.example/${i}`).join(" ");
    const r = parseApplication(form({ name: "Jo", email: "jo@example.com", links: six, cover_letter: "x".repeat(8001) }));
    expect(r.ok ? [] : Object.keys(r.errors).sort()).toEqual(["cover_letter", "links"]);
  });
});
