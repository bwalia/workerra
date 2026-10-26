import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MODULES } from "./catalogue";

const APP_DIR = join(__dirname, "..", "app");

describe("module catalogue", () => {
  it("has unique ids and routes", () => {
    const ids = MODULES.map((m) => m.id);
    const paths = MODULES.map((m) => m.basePath).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it.each(MODULES.filter((m) => m.basePath).map((m) => [m.id, m.basePath!]))(
    "%s has a page at %s",
    (_id, basePath) => {
      const routeGroups = ["", "(marketing)"];
      const found = routeGroups.some((g) => existsSync(join(APP_DIR, g, basePath, "page.tsx")));
      expect(found).toBe(true);
    },
  );

  it("lists planned capabilities for every module", () => {
    for (const m of MODULES) expect(m.planned.length).toBeGreaterThan(0);
  });
});
