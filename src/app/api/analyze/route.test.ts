import { describe, expect, it, vi } from "vitest";

describe("POST /api/analyze", () => {
  it("returns a clear error when the OpenRouter key is missing", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/analyze", { method: "POST", body: new FormData() }));
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(503);
    expect(payload.error).toContain("OPENROUTER_API_KEY");
  });
});
