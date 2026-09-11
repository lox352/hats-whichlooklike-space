type ZoneData = typeof import("../assets/ne_10m_time_zones.json");
let zonesPromise: Promise<{ default: ZoneData }> | undefined;
const zones = () => zonesPromise ??= import("../assets/ne_10m_time_zones.json");
const offsetCache = new Map<string, number>();
import { GlobalCoordinates } from "../types/GlobalCoordinates";
import { multiPolygon, point } from "@turf/helpers";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { Position } from "geojson";

import { DateTime } from "./celestial-coordinates";

export const findTimeZone = async (coordinates: GlobalCoordinates): Promise<number> => {
  const key = `${coordinates.latitude},${coordinates.longitude}`;
  const cached = offsetCache.get(key);
  if (cached !== undefined) return cached;
  const timezones = (await zones()).default;
  const pt = point([coordinates.longitude, coordinates.latitude]);
  for (const feature of timezones.features) {
    const poly = multiPolygon(feature.geometry.coordinates as Position[][][]);
    if (booleanPointInPolygon(pt, poly)) {
      offsetCache.set(key, feature.properties.zone);
      return feature.properties.zone;
    }
  }
  throw new Error("No time zone found here. Enter a UTC offset below.");
};
const calculateUtc = async (dateTime: DateTime, coordinates: GlobalCoordinates): Promise<DateTime> =>
  utcAtOffset(dateTime, await findTimeZone(coordinates));

/** Civil offset conversion, including month and year boundaries. */
export const utcAtOffset = (dateTime: DateTime, offset: number): DateTime => {
  const date = new Date(Date.UTC(dateTime.year ?? new Date().getFullYear(),
    dateTime.month - 1, dateTime.day, dateTime.hour, dateTime.minute - offset * 60));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1,
    day: date.getUTCDate(), hour: date.getUTCHours(), minute: date.getUTCMinutes() };
};

export { calculateUtc, type DateTime };
