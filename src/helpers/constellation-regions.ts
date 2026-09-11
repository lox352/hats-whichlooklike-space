import boundaries from "../data/constellation-boundaries.json";
import precession from "../data/j2000-to-b1875.json";
import { GlobalCoordinates } from "../types/GlobalCoordinates";
import { OrientationParameters } from "../types/OrientationParameters";
import { Stitch } from "../types/Stitch";
import { skyCoordinatesForStitch } from "./sky-geometry";

/*
 * Which constellation a point of sky is in.
 *
 * The sky is tiled: the IAU divided the whole sphere into 88 regions in
 * 1930, on Delporte's boundaries, so every direction - a star, or the dark
 * between two - belongs to exactly one constellation. That is what lets
 * every stitch on the hat carry a label, not only the ones with a star.
 *
 * The boundaries run along lines of right ascension and declination, but
 * in the equatorial frame of 1875, and the sky has precessed since: a
 * boundary that was a straight line then is a gentle curve now. So the
 * lookup goes the other way - the J2000 direction is precessed back to
 * 1875 with a fixed rotation, and asked against the original straight
 * lines. Roman (1987) tabulated those lines for exactly this purpose: 357
 * rows of "from this RA to that RA, north of this declination, it is X",
 * ordered so the first row that matches is the answer.
 *
 * The precession matrix and the reference fixture were generated with
 * Astropy by scripts/constellation-reference.py, and the test checks this
 * lookup against Astropy's own answer at some four thousand points.
 */

const radians = Math.PI / 180;

/**
 * Roman's table, one row per boundary band: [RA from, RA to) in hours,
 * declination south limit in degrees, and the constellation.
 */
type BoundaryRow = [number, number, number, string];

const table = boundaries as BoundaryRow[];
const matrix = precession as number[][];

/** The IAU constellation a J2000 direction falls in, by abbreviation. */
export const constellationAt = (coordinates: GlobalCoordinates): string => {
  const { latitude, longitude } = coordinates;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90
  )
    throw new Error("Invalid sky coordinates");

  // To a unit vector, back to 1875, and to RA in hours and declination.
  const dec = latitude * radians;
  const ra = longitude * radians;
  const j2000 = [
    Math.cos(dec) * Math.cos(ra),
    Math.cos(dec) * Math.sin(ra),
    Math.sin(dec),
  ];
  const [x, y, z] = matrix.map((row) =>
    row.reduce((sum, value, i) => sum + value * j2000[i], 0),
  );
  const hours = (((Math.atan2(y, x) / radians / 15) % 24) + 24) % 24;
  const south = Math.atan2(z, Math.hypot(x, y)) / radians;

  // Half-open in RA, so a boundary line has one owner, at the 0h seam too.
  const row = table.find(
    ([from, to, limit]) => hours >= from && hours < to && south >= limit,
  );
  if (!row) throw new Error("Constellation boundary data does not cover this direction");
  return row[3];
};

/**
 * A label for every knitted stitch of a settled hat, from where each one
 * faces once the hat is turned to its sky. The phantom stitch 0 is skipped.
 */
export const regionsForStitches = (
  stitches: Stitch[],
  orientation: OrientationParameters,
): Record<number, string> => {
  const maxY = stitches.reduce((top, s) => Math.max(top, s.position.y), 0);
  return Object.fromEntries(
    stitches
      .filter((s) => s.id > 0)
      .map((s) => [
        s.id,
        constellationAt(skyCoordinatesForStitch(s.position, maxY, orientation)),
      ]),
  );
};
