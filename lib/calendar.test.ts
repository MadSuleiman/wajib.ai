import { describe, expect, it } from "bun:test";

import { buildGoogleCalendarUrl } from "@/lib/calendar";

describe("buildGoogleCalendarUrl", () => {
  it("builds a valid Google Calendar URL with timezone", () => {
    const url = buildGoogleCalendarUrl({
      title: "Focus Session",
      start: new Date(2026, 0, 2, 9, 5, 6),
      end: new Date(2026, 0, 2, 10, 15, 30),
      timeZone: "UTC",
    });

    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://calendar.google.com");
    expect(parsed.pathname).toBe("/calendar/render");
    expect(parsed.searchParams.get("action")).toBe("TEMPLATE");
    expect(parsed.searchParams.get("text")).toBe("Focus Session");
    expect(parsed.searchParams.get("dates")).toBe(
      "20260102T090506/20260102T101530",
    );
    expect(parsed.searchParams.get("ctz")).toBe("UTC");
  });

  it("omits timezone when not provided", () => {
    const url = buildGoogleCalendarUrl({
      title: "Deep Work",
      start: new Date(2026, 5, 1, 8, 0, 0),
      end: new Date(2026, 5, 1, 9, 0, 0),
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get("ctz")).toBeNull();
  });
});
