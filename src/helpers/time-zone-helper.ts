import { GlobalCoordinates } from "../types/GlobalCoordinates";
import { DateTime, daysInMonth } from "./celestial-coordinates";

/*
 * From a clock time at a place to an instant.
 *
 * The place gives its time zone (see time-zone-location), and the zone's
 * rules - as the browser's own Intl implementation knows them, daylight
 * saving included - turn the clock reading into a moment in UT. Twice a
 * year that is not one-to-one: a time the clocks skipped going forward
 * never happened, and a time they repeated going back happened twice.
 * instantsForLocalTime reports those honestly; resolveLocalTime settles
 * them the way a person setting a camera clock would, and says what it did.
 */
const zoneCache = new Map<string, string[]>();
/** The zones a place is in, usually one; more than one on a boundary. */
export async function findTimeZones(
  coordinates: GlobalCoordinates,
): Promise<string[]> {
  const { latitude, longitude } = coordinates;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    throw new Error("Enter a valid latitude and longitude.");
  const key = `${latitude},${longitude}`;
  const cached = zoneCache.get(key);
  if (cached) return cached;
  const { zonesAt } = await import("./time-zone-location");
  const result = await zonesAt(latitude, longitude);
  if (!result.length) throw new Error("No time zone found for this location.");
  zoneCache.set(key, result);
  return result;
}
/** Whether a clock reading is a date and time that exists on the calendar. */
export const validLocalTime = (value: DateTime) => {
  const year = value.year ?? new Date().getFullYear();
  return (
    [year, value.month, value.day, value.hour, value.minute].every(
      Number.isInteger,
    ) &&
    year >= 1900 &&
    year <= 2100 &&
    value.month >= 1 &&
    value.month <= 12 &&
    value.day >= 1 &&
    value.day <= daysInMonth(value.month, year) &&
    value.hour >= 0 &&
    value.hour < 24 &&
    value.minute >= 0 &&
    value.minute < 60
  );
};
const wallTime = (value: DateTime) =>
  Date.UTC(
    value.year ?? new Date().getFullYear(),
    value.month - 1,
    value.day,
    value.hour,
    value.minute,
  );
const fromTimestamp = (timestamp: number): DateTime => {
  const d = new Date(timestamp);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
};
/** Civil offset conversion, including month and year boundaries. */
export const utcAtOffset = (value: DateTime, offset: number): DateTime =>
  fromTimestamp(wallTime(value) - offset * 3600000);
const formatters = new Map<string, Intl.DateTimeFormat>();
const formatter = (zone: string) => {
  let value = formatters.get(zone);
  if (!value) {
    value = new Intl.DateTimeFormat("en-GB-u-ca-gregory-nu-latn", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(zone, value);
  }
  return value;
};
/** A zone's offset from UT, in hours, at an instant - DST and all. */
export function offsetAt(timestamp: number, zone: string): number {
  const parts = Object.fromEntries(
    formatter(zone)
      .formatToParts(timestamp)
      .map((p) => [p.type, p.value]),
  );
  return (
    (Date.UTC(
      +parts.year,
      +parts.month - 1,
      +parts.day,
      +parts.hour,
      +parts.minute,
      +parts.second,
    ) -
      Math.floor(timestamp / 1000) * 1000) /
    3600000
  );
}
/** An offset as people write it: UTC+12:00, UTC−03:30. */
export const formatOffset = (offset: number) => {
  const minutes = Math.round(Math.abs(offset) * 60);
  return `UTC${offset < 0 ? "−" : "+"}${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
};
export interface LocalInstant {
  timestamp: number;
  utc: DateTime;
  offset: number;
}
/**
 * Every instant a clock reading could mean in a zone: one as a rule, none
 * when the clocks skipped it, two when they repeated it.
 *
 * Intl only goes one way, from an instant to a clock reading, so this tries
 * each offset the zone uses within two days either side and keeps the ones
 * that read back as the time asked for. That covers ordinary daylight
 * saving, the half-hour zones, and the date-line changes.
 */
export function instantsForLocalTime(
  value: DateTime,
  zone: string,
): LocalInstant[] {
  if (!validLocalTime(value))
    throw new Error("Enter a valid calendar date and time.");
  const wall = wallTime(value);
  const offsets = new Set(
    [-48, -24, 0, 24, 48].map((hours) =>
      offsetAt(wall + hours * 3600000, zone),
    ),
  );
  return [...offsets]
    .map((offset) => ({ timestamp: wall - offset * 3600000, offset }))
    .filter(
      ({ timestamp, offset }) =>
        Math.abs(offsetAt(timestamp, zone) - offset) < 1e-9,
    )
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((candidate) => ({
      ...candidate,
      utc: fromTimestamp(candidate.timestamp),
    }));
}
export interface ResolvedLocalTime {
  instant: LocalInstant;
  /**
   * Set when the clock reading was not one instant and a choice was made
   * for the user: what was chosen and why, in a sentence for the page.
   */
  note?: string;
}

/**
 * One instant for a clock reading, whatever the clocks did that night.
 *
 * Nobody remembers whether the sky they stood under was before or after a
 * daylight-saving change, so the page never asks. A repeated hour is taken
 * the first time round, which is the time still on daylight saving, since
 * that is what every clock in the house read until the change. A skipped
 * time is carried forward across the gap - 02:30 on a night the clocks
 * jumped from 02:00 to 03:00 becomes 03:30 - which is what a phone does
 * when you type it. Either way the note says so.
 */
export function resolveLocalTime(
  value: DateTime,
  zone: string,
): ResolvedLocalTime {
  const instants = instantsForLocalTime(value, zone);
  if (instants.length === 1) return { instant: instants[0] };
  if (instants.length > 1) {
    const [first] = instants;
    return {
      instant: first,
      note: `The clocks went back that night, so ${clock(value)} came round twice; this is the first, on ${formatOffset(first.offset)}.`,
    };
  }
  /*
   * The gap. The offset in force just before the reading is the one the
   * clocks were on when they jumped; applying it puts the instant in the
   * new offset, the same clock distance past the change.
   */
  const wall = wallTime(value);
  const before = offsetAt(wall - 24 * 3600000, zone);
  const timestamp = wall - before * 3600000;
  const after = offsetAt(timestamp, zone);
  const instant = { timestamp, offset: after, utc: fromTimestamp(timestamp) };
  const shown = fromTimestamp(timestamp + after * 3600000);
  return {
    instant,
    note: `The clocks went forward over ${clock(value)} that night, so it never happened; this is ${clock(shown)}, on ${formatOffset(after)}.`,
  };
}

const clock = (value: DateTime) =>
  `${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}`;

/**
 * The one UT instant for a clock reading at a place, or a reason there is
 * not exactly one. The design page handles those cases itself; this is for
 * callers that want a single answer or an error.
 */
export async function calculateUtc(
  value: DateTime,
  coordinates: GlobalCoordinates,
): Promise<DateTime> {
  const zones = await findTimeZones(coordinates);
  if (zones.length !== 1)
    throw new Error("Choose which local time zone applies at this boundary.");
  const instants = instantsForLocalTime(value, zones[0]);
  if (instants.length !== 1)
    throw new Error(
      instants.length
        ? "This time occurs twice when clocks move back."
        : "This time was skipped when clocks moved forward.",
    );
  return instants[0].utc;
}
export type { DateTime };
