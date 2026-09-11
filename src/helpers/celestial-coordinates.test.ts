import { describe, expect, it } from "vitest";
import {
  daysInMonth,
  greenwichSiderealTime,
  longitudeToRaHours,
  raHoursToLongitude,
  zenithFor,
} from "./celestial-coordinates";

describe("daysInMonth", () => {
  it("knows February", () => {
    expect(daysInMonth(2, 2023)).toBe(28);
    expect(daysInMonth(2, 2024)).toBe(29);
    expect(daysInMonth(2, 2100)).toBe(28);
    expect(daysInMonth(2, 2000)).toBe(29);
  });

  it("knows the thirty-day months", () => {
    for (const month of [4, 6, 9, 11]) expect(daysInMonth(month, 2025)).toBe(30);
    for (const month of [1, 3, 5, 7, 8, 10, 12]) expect(daysInMonth(month, 2025)).toBe(31);
  });
});

describe("greenwichSiderealTime", () => {
  /*
   * Anchors independent of the formula. At J2000.0 itself GMST is
   * 18h 41m 50.55s, a published constant. A sidereal day later it is the
   * same again; a solar day later it has gained 3m 56.6s.
   */
  it("is 18h 41m 50.55s at J2000.0", () => {
    const gmst = greenwichSiderealTime({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 });
    expect(gmst * 3600).toBeCloseTo(18 * 3600 + 41 * 60 + 50.55, 0);
  });

  it("gains about 3m 56.6s per solar day", () => {
    const a = greenwichSiderealTime({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 });
    const b = greenwichSiderealTime({ year: 2000, month: 1, day: 2, hour: 12, minute: 0 });
    expect(((b - a + 24) % 24) * 3600).toBeCloseTo(3 * 60 + 56.56, 0);
  });

  it("stays within [0, 24) far from the epoch", () => {
    for (const year of [1990, 2026, 2077]) {
      const gmst = greenwichSiderealTime({ year, month: 7, day: 4, hour: 3, minute: 17 });
      expect(gmst).toBeGreaterThanOrEqual(0);
      expect(gmst).toBeLessThan(24);
    }
  });

  it("no longer thinks every February has 28 days", () => {
    // 1 March 2024 is a day later than 1 March 2023 in sidereal terms only if
    // the leap day is counted; the old day-of-year fit missed it entirely.
    const a = greenwichSiderealTime({ year: 2024, month: 3, day: 1, hour: 0, minute: 0 });
    const b = greenwichSiderealTime({ year: 2024, month: 2, day: 29, hour: 0, minute: 0 });
    expect(((a - b + 24) % 24) * 60).toBeCloseTo(3.943, 1);
  });
});

describe("zenithFor", () => {
  it("has the observer's latitude directly overhead", () => {
    expect(zenithFor({ year: 2025, month: 6, day: 1, hour: 0, minute: 0 }, { latitude: -41.3, longitude: 174.8 }).dec).toBe(-41.3);
  });

  /*
   * Midnight at Greenwich on the equinoxes. At the September equinox the Sun
   * is at RA 12h, so the midnight meridian is near RA 0h; at the March
   * equinox it is the other way round. Good to a couple of tenths of an hour
   * because the equinox does not fall exactly at midnight.
   */
  it("puts RA 0h overhead at Greenwich midnight on the September equinox", () => {
    const { ra } = zenithFor({ year: 2025, month: 9, day: 22, hour: 0, minute: 0 }, { latitude: 51.5, longitude: 0 });
    const distanceFromZero = Math.min(ra, 24 - ra);
    expect(distanceFromZero).toBeLessThan(0.25);
  });

  it("puts RA 12h overhead at Greenwich midnight on the March equinox", () => {
    const { ra } = zenithFor({ year: 2025, month: 3, day: 20, hour: 0, minute: 0 }, { latitude: 51.5, longitude: 0 });
    expect(ra).toBeCloseTo(12, 0);
  });

  it("moves the overhead RA east with longitude, an hour per fifteen degrees", () => {
    const when = { year: 2025, month: 1, day: 1, hour: 22, minute: 0 };
    const here = zenithFor(when, { latitude: 0, longitude: 0 }).ra;
    const east = zenithFor(when, { latitude: 0, longitude: 30 }).ra;
    expect(((east - here + 24) % 24)).toBeCloseTo(2, 6);
  });

  it("always answers inside [0, 24)", () => {
    for (const longitude of [-180, -179.9, -90, 0, 90, 179.9, 180]) {
      for (const hour of [0, 6, 12, 23]) {
        const { ra } = zenithFor({ year: 2025, month: 12, day: 31, hour, minute: 59 }, { latitude: 0, longitude });
        expect(ra).toBeGreaterThanOrEqual(0);
        expect(ra).toBeLessThan(24);
      }
    }
  });

  it("defaults the year to this one", () => {
    const year = new Date().getFullYear();
    const withYear = zenithFor({ year, month: 5, day: 5, hour: 5, minute: 5 }, { latitude: 0, longitude: 0 });
    const without = zenithFor({ month: 5, day: 5, hour: 5, minute: 5 }, { latitude: 0, longitude: 0 });
    expect(without.ra).toBe(withYear.ra);
  });
});

describe("right ascension and catalogue longitude", () => {
  it("puts 0h at longitude 0 and 12h at the seam", () => {
    expect(raHoursToLongitude(0)).toBe(0);
    expect(raHoursToLongitude(6)).toBe(90);
    expect(Math.abs(raHoursToLongitude(12))).toBe(180);
    expect(raHoursToLongitude(18)).toBe(-90);
  });

  it("round trips", () => {
    for (const hours of [0, 0.5, 3, 6, 11.9, 12.1, 18, 23.9]) {
      expect(longitudeToRaHours(raHoursToLongitude(hours))).toBeCloseTo(hours, 9);
    }
  });

  it("agrees with the catalogue: Sirius is at 6h 45m, longitude 101.29", () => {
    expect(raHoursToLongitude(6 + 45 / 60 + 8.9 / 3600)).toBeCloseTo(101.29, 1);
  });
});
