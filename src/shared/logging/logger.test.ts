import { describe, expect, it } from "vitest";
import { createLogger, redact } from "./logger";

describe("createLogger", () => {
  it("drops events below the configured level", () => {
    const lines: string[] = [];
    const log = createLogger("warn", {}, (l) => lines.push(l));
    log.info("ignored");
    log.error("kept");
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({ level: "error", msg: "kept" });
  });

  it("carries child fields", () => {
    const lines: string[] = [];
    createLogger("debug", { app: "workerra" }, (l) => lines.push(l)).child({ module: "jobs" }).debug("hi");
    expect(JSON.parse(lines[0])).toMatchObject({ app: "workerra", module: "jobs" });
  });
});

describe("redact", () => {
  it("masks sensitive keys at any depth", () => {
    expect(redact({ user: "a", apiKey: "x", nested: { Authorization: "Bearer y" } })).toEqual({
      user: "a",
      apiKey: "[redacted]",
      nested: { Authorization: "[redacted]" },
    });
  });
});
