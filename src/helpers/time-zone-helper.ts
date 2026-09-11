import { GlobalCoordinates } from "../types/GlobalCoordinates";
import { DateTime, daysInMonth } from "./celestial-coordinates";
const zoneCache = new Map<string, string[]>();
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
export const formatOffset = (offset: number) => {
  const minutes = Math.round(Math.abs(offset) * 60);
  return `UTC${offset < 0 ? "−" : "+"}${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
};
export interface LocalInstant {
  timestamp: number;
  utc: DateTime;
  offset: number;
}
/** Invert Intl's IANA rules and round-trip every candidate. Never normalise a
 * skipped civil time or silently collapse a repeated hour. Sampling both sides
 * covers ordinary DST, half-hour transitions and date-line jumps. */
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
