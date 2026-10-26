import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleChatPost } from "./handler";

const SECRET = "nebula-secret-for-test";
const QUESTION = "My private CV text about Leeds";

function post(body: unknown, ip = "203.0.113.1") {
  return handleChatPost(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("handleChatPost", () => {
  let logs: string[];

  beforeEach(() => {
    vi.stubEnv("NEBULA_URL", "http://nebula.test");
    vi.stubEnv("NEBULA_API_KEY", SECRET);
    logs = [];
    vi.spyOn(process.stdout, "write").mockImplementation((line) => {
      logs.push(String(line));
      return true;
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("is offline (503) when NebulaDB is not configured", async () => {
    vi.stubEnv("NEBULA_URL", "");
    const res = await post({ message: "hi" });
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("assistant_offline");
  });

  it("rejects invalid bodies with 400", async () => {
    const res = await post({ message: "" });
    expect(res.status).toBe(400);
  });

  it("returns the assistant reply and logs no message text or secret", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ answer: "Happy to help.", model: "qwen", provider: "ollama", is_mock: false }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await post({ message: QUESTION, history: [{ role: "assistant", content: "Hello" }] });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { reply: "Happy to help." } });
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string).message).toContain(QUESTION);
    expect(logs.join("")).toContain("assistant replied");
    expect(logs.join("")).not.toContain(QUESTION);
    expect(logs.join("")).not.toContain(SECRET);
  });

  it("does not leak upstream errors to the client", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(`internal detail ${SECRET}`, { status: 500 })));
    const res = await post({ message: QUESTION });
    expect(res.status).toBe(502);
    const body = JSON.stringify(await res.json());
    expect(body).not.toContain("internal detail");
    expect(logs.join("")).not.toContain(QUESTION);
  });

  it("treats a mock LLM as offline rather than answering", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(Response.json({ answer: "canned", is_mock: true })));
    const res = await post({ message: "hi" });
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain("canned");
  });

  it("rate limits a client after 20 requests a minute", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ answer: "ok" })));
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) statuses.push((await post({ message: "hi" }, "198.51.100.7")).status);
    expect(statuses.slice(0, 20).every((s) => s === 200)).toBe(true);
    expect(statuses[20]).toBe(429);
  });
});
