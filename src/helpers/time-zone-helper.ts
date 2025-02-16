import timezones from "../assets/ne_10m_time_zones.json";
import { GlobalCoordinates } from "../types/GlobalCoordinates";
import { multiPolygon, point } from "@turf/helpers";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { Position } from "geojson";

interface DateTime {
  day: number;
  month: number;
  hour: number;
  minute: number;
}

const daysInMonth = (month: number, year: number): number => {
  return new Date(year, month, 0).getDate();
};

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
  const offsetHours = Math.floor(timeZoneOffset);
  const offsetMinutes = (timeZoneOffset - offsetHours) * 60;

  let utcMinute = dateTime.minute - offsetMinutes;
  let utcHour = dateTime.hour - offsetHours;
  let utcDay = dateTime.day;
  let utcMonth = dateTime.month;

  if (utcMinute < 0) {
    utcMinute += 60;
    utcHour -= 1;
  } else if (utcMinute >= 60) {
    utcMinute -= 60;
    utcHour += 1;
  }

  if (utcHour < 0) {
    utcHour += 24;
    utcDay -= 1;
  } else if (utcHour >= 24) {
    utcHour -= 24;
    utcDay += 1;
  }

  const currentYear = new Date().getFullYear();
  if (utcDay < 1) {
    utcMonth -= 1;
    if (utcMonth < 1) {
      utcMonth = 12;
    }
    utcDay = daysInMonth(utcMonth, currentYear);
  } else if (utcDay > daysInMonth(utcMonth, currentYear)) {
    utcDay = 1;
    utcMonth += 1;
    if (utcMonth > 12) {
      utcMonth = 1;
    }
  }

  const utcDateTime: DateTime = {
    day: utcDay,
    month: utcMonth,
    hour: utcHour,
    minute: utcMinute
  };

  return utcDateTime;
};

export { calculateUtc, type DateTime };
