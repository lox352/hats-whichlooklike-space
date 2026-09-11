import { GlobalCoordinates } from "../types/GlobalCoordinates";

/** A civil date and time. The year defaults to this one when not given. */
export interface DateTime {
  year?: number;
  day: number;
  month: number;
  hour: number;
  minute: number;
}

export const daysInMonth = (month: number, year: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

/**
 * Days since J2000.0 - noon UT on 1 January 2000 - for a moment in UT.
 * Date.UTC does the calendar, leap years included.
 */
const daysSinceJ2000 = ({
  year,
  month,
  day,
  hour,
  minute,
}: Required<DateTime>) =>
  (Date.UTC(year, month - 1, day, hour, minute) - Date.UTC(2000, 0, 1, 12)) /
  86_400_000;

const wrapHours = (hours: number) => ((hours % 24) + 24) % 24;

/**
 * Greenwich mean sidereal time, in hours, for a moment in UT.
 *
 * The standard approximation from the US Naval Observatory: linear in days
 * since J2000, good to a few seconds over decades. It replaces a fit that
 * took the day of the year alone, with February always 28 days, and so drifted
 * by up to a day's worth of sidereal time - about a degree of right ascension,
 * half a stitch - through every leap cycle.
 */
export const greenwichSiderealTime = (utc: Required<DateTime>): number =>
  wrapHours(18.697374558 + 24.06570982441908 * daysSinceJ2000(utc));

/**
 * The point of the sky directly overhead at a moment and place: its right
 * ascension is the local sidereal time, and its declination the latitude.
 *
 * `dateTime` is in UT. Right ascension comes back in hours, in [0, 24).
 *
 * No precession is applied. The catalogue is J2000, and the pole has drifted
 * about 0.36° since, which is under a sixth of a stitch on the default hat.
 */
export const zenithFor = (
  dateTime: DateTime,
  coordinates: GlobalCoordinates,
): { ra: number; dec: number } => {
  const utc = { year: new Date().getFullYear(), ...dateTime };
  const localSiderealTime = wrapHours(
    greenwichSiderealTime(utc) + coordinates.longitude / 15,
  );
  return { ra: localSiderealTime, dec: coordinates.latitude };
};

/**
 * Right ascension, in hours, to the longitude the catalogue uses: degrees,
 * wrapped into [-180, 180). And back.
 *
 * The one conversion for both ways of choosing a sky point. The custom
 * coordinate box used to do its own, offset by 180°, so typing 0h there
 * pointed the hat at 12h - self-consistent with its own display, and twelve
 * hours out from the catalogue and from the place-and-time path.
 */
export const raHoursToLongitude = (hours: number): number =>
  ((((hours * 15 + 180) % 360) + 360) % 360) - 180;

export const longitudeToRaHours = (longitude: number): number =>
  wrapHours(longitude / 15);

/** The name the design page has always used for this. */
export const calculateRightAscensionAndDeclension = zenithFor;
