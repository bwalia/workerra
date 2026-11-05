import { describe, expect, it } from "vitest";
import { safeNext } from "./next-path";

describe("safeNext", () => {
  it("allows recruiter pages only", () => {
    expect(safeNext("/recruiters/jobs/new")).toBe("/recruiters/jobs/new");
    expect(safeNext("/recruiters/jobs/abc?posted=1")).toBe("/recruiters/jobs/abc?posted=1");
    expect(safeNext("/recruiters")).toBe("/recruiters");
  });

  it("falls back to /recruiters for anything that could leave the site", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/recruiters//evil.example", "/jobs", "/recruitersx", null, 42]) {
      expect(safeNext(bad)).toBe("/recruiters");
    }
  });
});
