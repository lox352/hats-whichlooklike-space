import timezones from "../assets/ne_10m_time_zones.json";
import { GlobalCoordinates } from "../types/GlobalCoordinates";
import { multiPolygon, point } from "@turf/helpers";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { Position } from "geojson";

import { DateTime } from "./celestial-coordinates";

const calculateUtc = (
  dateTime: DateTime,
  coordinates: GlobalCoordinates
): DateTime => {

  const findTimeZone = (coordinates: GlobalCoordinates) => {
    const pt = point([coordinates.longitude, coordinates.latitude]);
  
    for (const feature of timezones.features) {
      const poly = multiPolygon(feature.geometry.coordinates as Position[][][]);
      if (booleanPointInPolygon(pt, poly)) {
        return feature.properties.zone;
      }
    }
  
    console.error(`No matching time zone found for the given coordinates ${coordinates.latitude}, ${coordinates.longitude}`);
    return 0;
  };

  const timeZoneOffset = findTimeZone(coordinates);
  return utcAtOffset(dateTime, timeZoneOffset);
};

/** Civil offset conversion, including month and year boundaries. */
export const utcAtOffset = (dateTime: DateTime, offset: number): DateTime => {
  const date = new Date(Date.UTC(dateTime.year ?? new Date().getFullYear(),
    dateTime.month - 1, dateTime.day, dateTime.hour, dateTime.minute - offset * 60));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1,
    day: date.getUTCDate(), hour: date.getUTCHours(), minute: date.getUTCMinutes() };
};

export { calculateUtc, type DateTime };
