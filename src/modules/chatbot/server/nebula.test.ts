import { describe, expect, it, vi } from "vitest";
import { AssistantError, nebulaChat } from "./nebula";

const config = { url: "http://nebula.test", apiKey: "secret-key" };
const reply = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe("nebulaChat", () => {
  it("posts to /api/v1/ai/chat with the bearer key and returns the answer", async () => {
    const fetchImpl = reply({ answer: " Hello ", model: "qwen2.5", provider: "ollama", is_mock: false });
    const result = await nebulaChat(config, { system: "sys", message: "hi" }, { fetchImpl });

    expect(result).toEqual({ answer: "Hello", model: "qwen2.5", provider: "ollama" });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://nebula.test/api/v1/ai/chat");
    expect((init?.headers as Record<string, string>).authorization).toBe("Bearer secret-key");
    expect(JSON.parse(init?.body as string)).toMatchObject({ message: "hi", system: "sys", stream: false });
  });

  it("omits authorization when no key is configured", async () => {
    const fetchImpl = reply({ answer: "ok" });
    await nebulaChat({ url: config.url, apiKey: null }, { system: "s", message: "m" }, { fetchImpl });
    expect((fetchImpl.mock.calls[0][1]?.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it("refuses mock LLM answers", async () => {
    const fetchImpl = reply({ answer: "canned", is_mock: true });
    await expect(nebulaChat(config, { system: "s", message: "m" }, { fetchImpl })).rejects.toMatchObject({ kind: "mock" });
  });

  it.each([
    ["non-2xx", reply({ error: "boom" }, 500)],
    ["empty answer", reply({ answer: "  " })],
    ["invalid JSON", vi.fn<typeof fetch>().mockResolvedValue(new Response("<html>", { status: 200 }))],
    ["network failure", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"))],
  ])("reports %s as an upstream error", async (_name, fetchImpl) => {
    const err = await nebulaChat(config, { system: "s", message: "m" }, { fetchImpl }).catch((e) => e);
    expect(err).toBeInstanceOf(AssistantError);
    expect(err.kind).toBe("upstream");
  });

  it("times out", async () => {
    const fetchImpl = vi.fn<typeof fetch>((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
      });
    });
    await expect(nebulaChat(config, { system: "s", message: "m" }, { fetchImpl, timeoutMs: 10 })).rejects.toMatchObject({
      kind: "timeout",
    });
  });
});
