import { GlobalCoordinates } from "../types/GlobalCoordinates";
import { DateTime } from "./time-zone-helper";

const calculateRightAscensionAndDeclension = (
  dateTime: DateTime,
  coordinates: GlobalCoordinates
): { ra: number; dec: number } => {
  const { day, month, hour, minute } = dateTime;
  const { latitude, longitude } = coordinates;

  // Convert longitude from degrees to hours
  const longitudeHours = longitude / 15;
  console.log(`Longitude Hours: ${longitudeHours}`);

  // Calculate Day of Year (DOY)
  function dayOfYear(day: number, month: number): number {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return daysInMonth.slice(0, month - 1).reduce((a, b) => a + b, 0) + day;
  }
  const N = dayOfYear(day, month);
  console.log(`Day of Year: ${N}`);

  // Approximate GMST (Greenwich Mean Sidereal Time) at 0h UT
  const GMST0 = 6.6 + 0.0657 * N;
  console.log(`GMST0: ${GMST0}`);

  // Convert time to UT in decimal hours
  const UT = hour + minute / 60;
  console.log(`UT: ${UT}`);

  // Compute GMST at given UT
  const GMST = (GMST0 + 1.00273791 * UT) % 24;
  console.log(`GMST: ${GMST}`);

  // Compute Local Sidereal Time (LST)
  const LST = (GMST + longitudeHours) % 24;
  console.log(`LST: ${LST}`);

  // The Right Ascension of the star directly overhead is equal to LST
  const ra = LST;
  console.log(`Right Ascension (RA): ${ra}`);

  // The Declination of the star directly overhead is equal to the observer's latitude
  const dec = latitude;
  console.log(`Declination (Dec): ${dec}`);

  return { ra, dec };
}

export { calculateRightAscensionAndDeclension };