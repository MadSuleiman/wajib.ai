import { afterEach, describe, expect, it } from "bun:test";

import {
  formatLocalDateTime,
  formatTimeZoneDisplay,
  getLocalDayBoundaries,
  getLocalTimeZone,
  toLocalMidnight,
} from "@/lib/timezone";

const globalAny = globalThis as typeof globalThis & { Intl: typeof Intl };
const originalIntl = globalAny.Intl;

afterEach(() => {
  globalAny.Intl = originalIntl;
});

describe("timezone utils", () => {
  it("returns a best-effort local timezone string", () => {
    const value = getLocalTimeZone();
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });

  it("falls back to UTC when Intl is unavailable", () => {
    globalAny.Intl = undefined as unknown as typeof Intl;
    expect(getLocalTimeZone()).toBe("UTC");
  });

  it("returns timezone input when display formatting fails", () => {
    const invalidZone = "Not/A_Real_Timezone";
    expect(formatTimeZoneDisplay(invalidZone)).toBe(invalidZone);
  });

  it("returns Invalid date for invalid inputs", () => {
    expect(formatLocalDateTime("invalid-date", "UTC")).toBe("Invalid date");
  });

  it("converts to local midnight without mutating input", () => {
    const input = new Date(2026, 0, 15, 13, 42, 30);
    const originalHours = input.getHours();
    const output = toLocalMidnight(input);

    expect(output).not.toBe(input);
    expect(output.getHours()).toBe(0);
    expect(output.getMinutes()).toBe(0);
    expect(output.getSeconds()).toBe(0);
    expect(output.getMilliseconds()).toBe(0);
    expect(input.getHours()).toBe(originalHours);
  });

  it("returns start/end boundaries for a local day", () => {
    const date = new Date(2026, 0, 15, 18, 5, 0);
    const { start, end } = getLocalDayBoundaries(date);
    const expectedEnd = new Date(start);
    expectedEnd.setDate(expectedEnd.getDate() + 1);

    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(end.getTime()).toBe(expectedEnd.getTime());
  });
});
