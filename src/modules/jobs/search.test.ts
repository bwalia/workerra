import { describe, expect, it } from "vitest";
import { formatSalary, hasFilters, jobSearchQuery } from "./search";
import { parseJobSearchParams } from "./search-params";

describe("hasFilters", () => {
  it("ignores the page number", () => {
    expect(hasFilters(parseJobSearchParams({ page: "2" }))).toBe(false);
    expect(hasFilters(parseJobSearchParams({ sector: "education" }))).toBe(true);
  });
});

describe("formatSalary", () => {
  it("formats ranges, single rates and missing pay", () => {
    expect(formatSalary({ min: 60000, max: 72000, currency: "GBP", period: "year" })).toBe("£60,000–£72,000 a year");
    expect(formatSalary({ min: 12.6, max: 12.6, currency: "GBP", period: "hour" })).toBe("£12.60 an hour");
    expect(formatSalary({ min: 500, max: null, currency: "GBP", period: "day" })).toBe("From £500 a day");
    expect(formatSalary(null)).toBeNull();
  });
});

describe("jobSearchQuery", () => {
  it("round-trips filters through the /jobs query string", () => {
    const filters = parseJobSearchParams({ q: "nurse", workplace: "onsite,hybrid", type: "full_time", sector: "healthcare" });
    const href = jobSearchQuery(filters, 2);
    expect(href).toBe("/jobs?q=nurse&workplace=onsite%2Chybrid&type=full_time&sector=healthcare&page=2");
    expect(parseJobSearchParams(Object.fromEntries(new URL(href, "http://x").searchParams))).toEqual({ ...filters, page: 2 });
  });
});
