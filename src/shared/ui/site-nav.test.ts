import { describe, expect, it } from "vitest";
import { FOOTER_NAV, MAIN_NAV, isActivePath } from "./site-nav";

describe("isActivePath", () => {
  it("matches the section and its sub-pages, not look-alike paths", () => {
    expect(isActivePath("/jobs", "/jobs")).toBe(true);
    expect(isActivePath("/jobs/sample-1", "/jobs")).toBe(true);
    expect(isActivePath("/jobsearch", "/jobs")).toBe(false);
    expect(isActivePath("/", "/jobs")).toBe(false);
  });
});

describe("site navigation", () => {
  it("only links to same-site paths", () => {
    for (const link of [...MAIN_NAV, ...FOOTER_NAV.flatMap((g) => g.links)]) expect(link.href).toMatch(/^\/(?!\/)/);
  });
});
