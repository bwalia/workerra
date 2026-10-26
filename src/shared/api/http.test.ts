import { describe, expect, it } from "vitest";
import { fail, notImplemented, ok } from "./http";

describe("api envelope", () => {
  it("wraps data", async () => {
    const res = ok({ a: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { a: 1 } });
  });

  it("wraps errors with a status", async () => {
    const res = fail(404, "not_found", "nope");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "not_found", message: "nope" } });
  });

  it("answers 501 for planned features", async () => {
    const res = notImplemented("Chat");
    expect(res.status).toBe(501);
    expect((await res.json()).error.code).toBe("not_implemented");
  });
});
