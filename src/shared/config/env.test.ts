import { describe, expect, it } from "vitest";
import { loadServerEnv } from "./env";
import { APP_ENVS, ENVIRONMENTS } from "./environments";

describe("loadServerEnv", () => {
  it("defaults to local with debug logging", () => {
    const env = loadServerEnv({});
    expect(env.appEnv).toBe("local");
    expect(env.logLevel).toBe("debug");
    expect(env.siteUrl).toBe("http://localhost:3020");
    expect(env.nebula).toBeNull();
    expect(env.opsapi).toBeNull();
    expect(env.jobshoutApiUrl).toBeNull();
  });

  it("only enables the CRM when fully configured", () => {
    expect(loadServerEnv({ OPSAPI_URL: "https://ops", OPSAPI_NAMESPACE: "workerra" }).opsapi).toBeNull();
    expect(
      loadServerEnv({ OPSAPI_URL: "https://ops/", OPSAPI_NAMESPACE: "workerra", OPSAPI_API_KEY: "k" }).opsapi,
    ).toEqual({ url: "https://ops", namespace: "workerra", apiKey: "k" });
  });

  it("derives the site URL from the ring", () => {
    expect(loadServerEnv({ APP_ENV: "acc" }).siteUrl).toBe("https://acc.workerra.uk");
    expect(loadServerEnv({ APP_ENV: "prod" }).siteUrl).toBe("https://www.workerra.uk");
  });

  it("defaults prod to info logging", () => {
    expect(loadServerEnv({ APP_ENV: "prod" }).logLevel).toBe("info");
  });

  it("rejects an unknown ring", () => {
    expect(() => loadServerEnv({ APP_ENV: "staging" })).toThrow(/APP_ENV/);
  });

  it("strips trailing slashes from URLs", () => {
    const env = loadServerEnv({ NEBULA_URL: "http://nebula:8080/", NEXT_PUBLIC_SITE_URL: "http://x/" });
    expect(env.nebula).toEqual({ url: "http://nebula:8080", apiKey: null });
    expect(env.siteUrl).toBe("http://x");
  });
});

describe("ENVIRONMENTS", () => {
  it("keeps every ring except prod behind the VPN", () => {
    const publicRings = APP_ENVS.filter((id) => ENVIRONMENTS[id].public);
    expect(publicRings).toEqual(["prod"]);
    expect(ENVIRONMENTS.prod.host).toBe("www.workerra.uk");
  });

  it("only lets prod be indexed", () => {
    expect(APP_ENVS.filter((id) => ENVIRONMENTS[id].indexable)).toEqual(["prod"]);
  });
});
