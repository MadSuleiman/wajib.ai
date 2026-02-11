import { describe, expect, it } from "bun:test";

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns ok=true with status 200", async () => {
    const response = GET();
    expect(response.status).toBe(200);

    const body = (await response.json()) as { ok: boolean };
    expect(body).toEqual({ ok: true });
  });
});
