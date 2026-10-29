import { describe, expect, it } from "vitest";
import { SAMPLE_JOBS } from "./sample-jobs";
import { SECTOR_LABELS, countBySector, formatSalary, hasFilters, jobSearchQuery, searchJobs } from "./search";
import { parseJobSearchParams } from "./search-params";
import type { Job } from "./types";

const search = (params: Record<string, string>) => searchJobs(SAMPLE_JOBS, parseJobSearchParams(params));
const titles = (params: Record<string, string>) => search(params).jobs.map((j) => j.title);

describe("sample jobs", () => {
  it("are clearly marked as test data", () => {
    for (const job of SAMPLE_JOBS) {
      expect(job.id).toMatch(/^sample-/);
      expect(job.company).toMatch(/\(Sample\)$/);
      expect(job.sample).toBe(true);
      expect(job.requirements.length).toBeGreaterThan(0);
    }
    expect(new Set(SAMPLE_JOBS.map((j) => j.id)).size).toBe(SAMPLE_JOBS.length);
  });
});

describe("searchJobs", () => {
  it("lists every open job, newest first", () => {
    const { jobs, total } = search({});
    expect(total).toBe(SAMPLE_JOBS.length);
    expect(jobs.map((j) => j.postedAt)).toEqual([...jobs.map((j) => j.postedAt)].sort().reverse());
  });

  it("matches every keyword across title, skills and description, ignoring case", () => {
    expect(titles({ q: "react" })).toEqual(["Senior React Developer"]);
    expect(titles({ q: "kubernetes terraform" })).toEqual(["DevOps Engineer (Kubernetes)"]);
    expect(titles({ q: "react kubernetes" })).toEqual([]);
  });

  it("filters by location, workplace and contract type", () => {
    expect(titles({ location: "leeds" })).toEqual(["Staff Nurse (Band 5), Acute Medicine"]);
    expect(titles({ workplace: "remote" })).toEqual(["DevOps Engineer (Kubernetes)"]);
    expect(titles({ type: "part_time,internship" }).sort()).toEqual(["Customer Service Advisor", "Digital Marketing Intern"]);
    expect(titles({ workplace: "hybrid", location: "London" })).toEqual(["Management Accountant"]);
  });

  it("filters by sector", () => {
    expect(titles({ sector: "technology" }).sort()).toEqual(["DevOps Engineer (Kubernetes)", "Senior React Developer"]);
    expect(titles({ sector: "technology", workplace: "remote" })).toEqual(["DevOps Engineer (Kubernetes)"]);
    expect(titles({ sector: "admin" })).toEqual([]);
  });

  it("works with the searches the assistant links to", () => {
    expect(titles({ q: "React developer", location: "Manchester", workplace: "hybrid" })).toEqual(["Senior React Developer"]);
  });

  it("leaves out jobs that are not open", () => {
    const closed: Job = { ...SAMPLE_JOBS[0], id: "sample-closed", status: "closed" };
    expect(searchJobs([closed], parseJobSearchParams({})).total).toBe(0);
  });

  it("paginates and clamps the page to the last one", () => {
    const filters = parseJobSearchParams({ page: "9" });
    const result = searchJobs(SAMPLE_JOBS, filters, 4);
    expect(result.pageCount).toBe(Math.ceil(SAMPLE_JOBS.length / 4));
    expect(result.page).toBe(result.pageCount);
    expect(result.jobs.length).toBe(SAMPLE_JOBS.length - 4 * (result.pageCount - 1));
  });
});

describe("countBySector", () => {
  it("counts open jobs in every sector, including empty ones", () => {
    const counts = countBySector(SAMPLE_JOBS);
    expect(Object.keys(counts).sort()).toEqual(Object.keys(SECTOR_LABELS).sort());
    expect(counts.technology).toBe(2);
    expect(counts.admin).toBe(0);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(SAMPLE_JOBS.length);
  });
});

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
