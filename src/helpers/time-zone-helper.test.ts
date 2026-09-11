import { describe, expect, it } from "vitest";
import { utcAtOffset } from "./time-zone-helper";
describe("civil time conversion", () => {
  it("carries the year backwards", () =>
    expect(
      utcAtOffset({ year: 2024, month: 1, day: 1, hour: 0, minute: 15 }, 5.5),
    ).toEqual({ year: 2023, month: 12, day: 31, hour: 18, minute: 45 }));
  it("carries the year forwards", () =>
    expect(
      utcAtOffset(
        { year: 2023, month: 12, day: 31, hour: 23, minute: 45 },
        -3.5,
      ),
    ).toEqual({ year: 2024, month: 1, day: 1, hour: 3, minute: 15 }));
  it("retains leap day", () =>
    expect(
      utcAtOffset({ year: 2024, month: 3, day: 1, hour: 0, minute: 0 }, 1),
    ).toEqual({ year: 2024, month: 2, day: 29, hour: 23, minute: 0 }));
});

import { instantsForLocalTime, resolveLocalTime, validLocalTime } from "./time-zone-helper";
import type { DateTime } from "./time-zone-helper";
const local = (
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
) => ({ year, month, day, hour, minute });
describe("date-aware IANA time", () => {
  it.each([
    ["America/New_York", local(2026, 1, 15), -5],
    ["America/New_York", local(2026, 7, 15), -4],
    ["Europe/London", local(2026, 1, 15), 0],
    ["Europe/London", local(2026, 7, 15), 1],
    ["Australia/Sydney", local(2026, 1, 15), 11],
    ["Australia/Sydney", local(2026, 7, 15), 10],
    ["Australia/Lord_Howe", local(2026, 1, 15), 11],
    ["Australia/Lord_Howe", local(2026, 7, 15), 10.5],
    ["America/Phoenix", local(2026, 7, 15), -7],
    ["Asia/Kathmandu", local(2026, 7, 15), 5.75],
    ["Asia/Kolkata", local(2026, 7, 15), 5.5],
    ["Pacific/Chatham", local(2026, 1, 15), 13.75],
  ])("%s applies the rules at %j", (zone, date, offset) => {
    const results = instantsForLocalTime(date, zone);
    expect(results).toHaveLength(1);
    expect(results[0].offset).toBe(offset);
  });
  it("uses historical US transition dates", () => {
    expect(
      instantsForLocalTime(local(2006, 3, 20), "America/New_York")[0].offset,
    ).toBe(-5);
    expect(
      instantsForLocalTime(local(2007, 3, 20), "America/New_York")[0].offset,
    ).toBe(-4);
  });
  it("rejects the spring gap and preserves both autumn instants", () => {
    expect(
      instantsForLocalTime(local(2026, 3, 8, 2, 30), "America/New_York"),
    ).toEqual([]);
    const repeated = instantsForLocalTime(
      local(2026, 11, 1, 1, 30),
      "America/New_York",
    );
    expect(repeated.map((i) => i.offset)).toEqual([-4, -5]);
    expect(repeated.map((i) => i.utc.hour)).toEqual([5, 6]);
  });
  it("handles a half-hour fold and gap", () => {
    const repeated = instantsForLocalTime(
      local(2026, 4, 5, 1, 45),
      "Australia/Lord_Howe",
    );
    expect(repeated.map((i) => i.offset)).toEqual([11, 10.5]);
    expect(
      instantsForLocalTime(local(2026, 10, 4, 2, 15), "Australia/Lord_Howe"),
    ).toEqual([]);
  });
  it("rejects Samoa’s skipped calendar day", () =>
    expect(instantsForLocalTime(local(2011, 12, 30), "Pacific/Apia")).toEqual(
      [],
    ));
  it("carries UTC over midnight and leap day", () =>
    expect(
      instantsForLocalTime(local(2024, 3, 1, 0, 15), "Australia/Sydney")[0].utc,
    ).toEqual(local(2024, 2, 29, 13, 15)));
  it("does not silently normalise invalid calendar input", () => {
    expect(validLocalTime(local(2025, 2, 29))).toBe(false);
    expect(() => instantsForLocalTime(local(2025, 2, 29), "UTC")).toThrow();
  });
});

describe("resolveLocalTime", () => {
  const local = (
    year: number,
    month: number,
    day: number,
    hour = 12,
    minute = 0,
  ): DateTime => ({ year, month, day, hour, minute });

  it("passes an ordinary time through without a note", () => {
    const resolved = resolveLocalTime(local(2026, 3, 12, 21, 40), "Australia/Sydney");
    expect(resolved.note).toBeUndefined();
    expect(resolved.instant.offset).toBe(11);
  });

  it("takes a repeated hour the first time round, still on daylight time", () => {
    const resolved = resolveLocalTime(local(2026, 11, 1, 1, 30), "America/New_York");
    expect(resolved.instant.offset).toBe(-4);
    expect(resolved.instant.utc.hour).toBe(5);
    expect(resolved.note).toMatch(/came round twice/);
  });

  it("carries a skipped time forward across the gap", () => {
    // 02:30 never happened: the clocks jumped from 02:00 to 03:00.
    const resolved = resolveLocalTime(local(2026, 3, 8, 2, 30), "America/New_York");
    expect(resolved.instant.offset).toBe(-4);
    // 03:30 EDT is 07:30 UT.
    expect(resolved.instant.utc.hour).toBe(7);
    expect(resolved.instant.utc.minute).toBe(30);
    expect(resolved.note).toMatch(/never happened; this is 03:30/);
  });

  it("carries a skipped half hour forward on Lord Howe", () => {
    const resolved = resolveLocalTime(local(2026, 10, 4, 2, 15), "Australia/Lord_Howe");
    expect(resolved.instant.offset).toBe(11);
    expect(resolved.note).toMatch(/this is 02:45/);
  });
});
