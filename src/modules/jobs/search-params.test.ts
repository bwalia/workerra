import { describe, expect, it } from "vitest";
import { parseJobSearchParams } from "./search-params";

describe("parseJobSearchParams", () => {
  it("returns empty defaults", () => {
    expect(parseJobSearchParams({})).toEqual({ q: "", location: "", workplace: [], employmentType: [], sector: null, page: 1 });
  });

  it("keeps known filters and drops unknown ones", () => {
    const f = parseJobSearchParams({ q: " nurse ", workplace: "remote,moon", type: ["contract", "gig"], page: "3" });
    expect(f).toEqual({ q: "nurse", location: "", workplace: ["remote"], employmentType: ["contract"], sector: null, page: 3 });
  });

  it("keeps a known sector and drops an unknown one", () => {
    expect(parseJobSearchParams({ sector: "healthcare" }).sector).toBe("healthcare");
    expect(parseJobSearchParams({ sector: "toString" }).sector).toBeNull();
    expect(parseJobSearchParams({ sector: "astronaut" }).sector).toBeNull();
  });

  it("falls back to page 1 for invalid pages", () => {
    expect(parseJobSearchParams({ page: "-2" }).page).toBe(1);
    expect(parseJobSearchParams({ page: "abc" }).page).toBe(1);
  });
});
