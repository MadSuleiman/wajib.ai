import { describe, expect, it } from "bun:test";

import { GET } from "@/app/manifest.webmanifest/route";

type ManifestIcon = {
  src: string;
  sizes: string;
  type: string;
};

type ManifestPayload = {
  name: string;
  short_name: string;
  start_url: string;
  display: string;
  icons: ManifestIcon[];
};

describe("GET /manifest.webmanifest", () => {
  it("returns a valid manifest payload and content-type", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/manifest+json",
    );

    const body = (await response.json()) as ManifestPayload;
    expect(body.name).toBe("wajib");
    expect(body.short_name).toBe("Wajib");
    expect(body.start_url).toBe("/");
    expect(body.display).toBe("standalone");
    expect(Array.isArray(body.icons)).toBe(true);
    expect(body.icons.length).toBeGreaterThan(0);
    expect(body.icons.some((icon) => icon.src === "/logos/logo.svg")).toBe(
      true,
    );
  });
});
