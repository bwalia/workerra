import { describe, expect, it } from "vitest";
import { MAX_SEALED_LENGTH, seal, unseal } from "./seal";

const SECRET = "a".repeat(32);

describe("seal", () => {
  it("round-trips a value", () => {
    const value = { userId: "u", opsapi: { token: "t", expiresAt: 1 } };
    expect(unseal(seal(value, SECRET), SECRET)).toEqual(value);
  });

  it("rejects another secret, tampering and junk", () => {
    const sealed = seal({ a: 1 }, SECRET);
    expect(unseal(sealed, "b".repeat(32))).toBeNull();
    const flipped = sealed.slice(0, -2) + (sealed.endsWith("A") ? "B" : "A") + sealed.slice(-1);
    expect(unseal(flipped, SECRET)).toBeNull();
    expect(unseal("v1.not-base64!", SECRET)).toBeNull();
    expect(unseal(undefined, SECRET)).toBeNull();
  });

  it("never seals the same value to the same string", () => {
    expect(seal({ a: 1 }, SECRET)).not.toBe(seal({ a: 1 }, SECRET));
  });

  it("fits an OpsAPI-sized token (JWT with every permission) in one cookie", () => {
    const perms = Object.fromEntries(Array.from({ length: 140 }, (_, i) => [`module_${i}`, ["manage"]]));
    const payload = Buffer.from(JSON.stringify({ exp: 1, userinfo: { namespace: { permissions: perms } } })).toString("base64url");
    const jwt = `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.${payload}.${"s".repeat(43)}`;
    expect(jwt.length).toBeGreaterThan(3000);
    expect(seal({ opsapi: { token: jwt, refreshToken: "r".repeat(64) } }, SECRET).length).toBeLessThan(MAX_SEALED_LENGTH);
  });
});
