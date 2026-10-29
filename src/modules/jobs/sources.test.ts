import { describe, expect, it } from "vitest";
import type { ApiJob } from "./opsapi-types";
import { SAMPLE_JOBS } from "./sample-jobs";
import { parseJobSearchParams } from "./search-params";
import { fromApiJob, opsApiJobSource, sampleJobSource } from "./sources";

const UUID = "063e7f73-2579-498a-958b-7ea389e0ab1c";

const apiJob = (over: Partial<ApiJob> = {}): ApiJob => ({
  uuid: UUID,
  title: "Staff Nurse",
  company: "Aire Valley Health Trust (Sample)",
  location: "Leeds",
  workplace: "onsite",
  employment_type: "full_time",
  sector: "healthcare",
  salary: { min: 29970, max: 36483, currency: "GBP", period: "year" },
  description: "Ward nurse",
  responsibilities: [],
  requirements: ["NMC PIN"],
  benefits: ["NHS Pension"],
  skills: ["Nursing"],
  posted_at: "2026-10-29",
  closes_at: null,
  sample: true,
  ...over,
});

/** A fetch that records each request and answers from `respond`. */
function fakeFetch(respond: (url: URL) => { status?: number; body: unknown }) {
  const calls: { url: URL; headers: Headers }[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const url = new URL(req.url);
    calls.push({ url, headers: req.headers });
    const { status = 200, body } = respond(url);
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  };
  return { fetch: fetch as typeof globalThis.fetch, calls };
}

const source = (fetch: typeof globalThis.fetch, includeSamples = true) =>
  opsApiJobSource({ url: "http://opsapi.test", namespace: "workerra", apiKey: "opsk_test", includeSamples, fetch });

const page = (data: ApiJob[], meta: Partial<{ page: number; total: number; total_pages: number }> = {}) => ({
  success: true,
  data,
  meta: { page: 1, per_page: 10, total: data.length, total_pages: 1, ...meta },
});

describe("opsApiJobSource", () => {
  it("sends the search filters, credentials and workspace to the plugin", async () => {
    const { fetch, calls } = fakeFetch(() => ({ body: page([apiJob()]) }));
    const filters = parseJobSearchParams({ q: "nurse", location: "Leeds", sector: "healthcare", workplace: "onsite,remote", type: "full_time", page: "2" });
    await source(fetch).search(filters);

    const [{ url, headers }] = calls;
    expect(url.pathname).toBe("/api/v2/workerra/jobs");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: "nurse",
      location: "Leeds",
      sector: "healthcare",
      workplace: "onsite,remote",
      type: "full_time",
      include_samples: "true",
      page: "2",
      per_page: "10",
    });
    expect(headers.get("authorization")).toBe("Bearer opsk_test");
    expect([headers.get("x-namespace-slug"), headers.get("x-namespace-id")]).toContain("workerra");
  });

  it("leaves out empty filters and asks for samples only where they're allowed", async () => {
    const { fetch, calls } = fakeFetch(() => ({ body: page([]) }));
    await source(fetch, false).search(parseJobSearchParams({}), 3);
    expect(Object.fromEntries(calls[0].url.searchParams)).toEqual({ include_samples: "false", page: "1", per_page: "3" });
  });

  it("maps results and paging", async () => {
    const { fetch } = fakeFetch(() => ({ body: page([apiJob()], { page: 1, total: 14, total_pages: 2 }) }));
    const result = await source(fetch).search(parseJobSearchParams({}));
    expect(result).toMatchObject({ total: 14, page: 1, pageCount: 2 });
    expect(result.jobs[0]).toMatchObject({ id: UUID, title: "Staff Nurse", sample: true, employmentType: "full_time" });
  });

  it("falls back to the last page when asked for one past the end", async () => {
    const { fetch, calls } = fakeFetch((url) =>
      url.searchParams.get("page") === "9"
        ? { body: page([], { page: 9, total: 12, total_pages: 2 }) }
        : { body: page([apiJob()], { page: 2, total: 12, total_pages: 2 }) },
    );
    const result = await source(fetch).search(parseJobSearchParams({ page: "9" }));
    expect(calls.map((c) => c.url.searchParams.get("page"))).toEqual(["9", "2"]);
    expect(result).toMatchObject({ page: 2, pageCount: 2 });
    expect(result.jobs).toHaveLength(1);
  });

  it("finds one listing, and returns null for unknown or non-uuid ids", async () => {
    const { fetch, calls } = fakeFetch((url) =>
      url.pathname.endsWith(UUID) ? { body: { success: true, data: apiJob() } } : { status: 404, body: { success: false, error: "Job not found" } },
    );
    expect((await source(fetch).find(UUID))?.id).toBe(UUID);
    expect(await source(fetch).find("4b0c9b0e-0000-4000-8000-000000000000")).toBeNull();
    expect(await source(fetch).find("sample-staff-nurse-leeds")).toBeNull();
    expect(calls).toHaveLength(2); // the non-uuid id never reaches OpsAPI
  });

  it("fills in sectors with no listings", async () => {
    const { fetch } = fakeFetch(() => ({ body: { success: true, data: [{ sector: "healthcare", count: 3 }] } }));
    const counts = await source(fetch).sectorCounts();
    expect(counts.healthcare).toBe(3);
    expect(counts.technology).toBe(0);
  });

  it("throws when OpsAPI fails, so the page can say search is unavailable", async () => {
    const { fetch } = fakeFetch(() => ({ status: 500, body: { success: false, error: "boom" } }));
    await expect(source(fetch).search(parseJobSearchParams({}))).rejects.toThrow();
    await expect(source(fetch).find(UUID)).rejects.toThrow();
  });
});

describe("fromApiJob", () => {
  it("drops empty optional lists and keeps the sample label", () => {
    const job = fromApiJob(apiJob())!;
    expect(job.responsibilities).toBeUndefined();
    expect(job.benefits).toEqual(["NHS Pension"]);
    expect(job.sample).toBe(true);
    expect(fromApiJob(apiJob({ sample: false }))!.sample).toBeUndefined();
  });

  it("skips listings whose ATS employment type Workerra doesn't know", () => {
    expect(fromApiJob(apiJob({ employment_type: null }))).toBeNull();
  });
});

describe("sampleJobSource", () => {
  it("searches the built-in listings and finds open ones by id", async () => {
    const samples = sampleJobSource();
    expect((await samples.search(parseJobSearchParams({ sector: "technology" }))).total).toBe(2);
    expect((await samples.find(SAMPLE_JOBS[0].id))?.title).toBe(SAMPLE_JOBS[0].title);
    expect(await samples.find("nope")).toBeNull();
  });
});
