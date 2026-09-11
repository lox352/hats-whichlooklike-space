import { GlobalCoordinates } from "../types/GlobalCoordinates";

/**
 * Nearest-stitch lookup on the sphere.
 *
 * The projection runs stars onto stitches: for each of ~5,000 catalogue
 * stars, which of ~7,600 stitches is nearest? The old search measured
 * "nearest" as Euclidean distance in raw degrees of latitude and longitude,
 * which is wrong in two ways that both matter on a hat. Near the crown a
 * degree of longitude is a sliver of real sky - at the crown stitch's
 * declination of 88° it is 28 times shorter than a degree of latitude - so
 * matching there collapsed into "nearest in longitude", and the crown is
 * exactly where the chosen sky point always lands. And at the ±180° seam two
 * points 2° apart scored 358°, so Crux, which straddles it, came apart.
 *
 * Both are artefacts of doing spherical geometry on a flat lat/lon plane, so
 * neither is patched: points are compared as unit vectors by dot product,
 * which orders them by true angular distance and has no seam and no
 * converging meridians to get wrong. The trig is paid once per point.
 */

export type UnitVector = [number, number, number];

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const toUnitVector = ({
  latitude,
  longitude,
}: GlobalCoordinates): UnitVector => {
  const lat = toRadians(latitude);
  const lon = toRadians(longitude);
  const cosLat = Math.cos(lat);
  return [cosLat * Math.cos(lon), cosLat * Math.sin(lon), Math.sin(lat)];
};

export const dot = (a: UnitVector, b: UnitVector): number =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Great-circle angle between two unit vectors, in degrees. */
export const angleBetween = (a: UnitVector, b: UnitVector): number =>
  (Math.acos(Math.min(Math.max(dot(a, b), -1), 1)) * 180) / Math.PI;

export interface Nearest {
  /** Index into the coordinates the index was built from, or -1 for none. */
  index: number;
  /** Cosine of the angle to it: 1 is a perfect hit. -Infinity for none. */
  cosine: number;
}

const none: Nearest = { index: -1, cosine: -Infinity };

export interface SkyIndex {
  readonly size: number;
  nearest(vector: UnitVector): Nearest;
}

/**
 * The reference the index is tested against: every candidate, no shortcuts.
 * Exported so the test can prove the indexed search returns the same answer.
 */
export const nearestByBruteForce = (
  vector: UnitVector,
  coordinates: GlobalCoordinates[]
): Nearest => {
  let best: Nearest = none;
  coordinates.forEach((coordinate, index) => {
    const cosine = dot(vector, toUnitVector(coordinate));
    if (cosine > best.cosine) best = { index, cosine };
  });
  return best;
};

/**
 * Build an index over the stitches' sky coordinates.
 *
 * Stitches are bucketed into bands of declination. A query scans its own band
 * and then works outwards one band at a time, stopping as soon as no
 * unscanned band could hold anything closer. The stop is exact rather than a
 * heuristic: a point in a band `r` rings away differs in declination by more
 * than `(r - 1)` band widths, and the great-circle distance is never less
 * than the difference in declination, so once the best match is closer than
 * that, the search is done.
 *
 * Stitches already come in rows of near-constant declination, so declination
 * bands are the structure the data has. A k-d tree would spend its build
 * discovering it.
 */
export const buildSkyIndex = (
  coordinates: GlobalCoordinates[],
  bandDegrees = 2
): SkyIndex => {
  const size = coordinates.length;
  const bandCount = Math.ceil(180 / bandDegrees) + 1;
  const bandOf = (latitude: number) =>
    Math.min(Math.max(Math.floor((latitude + 90) / bandDegrees), 0), bandCount - 1);

  // Structure of arrays: the inner loop reads three floats, not an object.
  const xs = new Float64Array(size);
  const ys = new Float64Array(size);
  const zs = new Float64Array(size);
  const counts = new Int32Array(bandCount + 1);
  const bands = new Int32Array(size);

  coordinates.forEach((coordinate, index) => {
    const [x, y, z] = toUnitVector(coordinate);
    xs[index] = x;
    ys[index] = y;
    zs[index] = z;
    const band = bandOf(coordinate.latitude);
    bands[index] = band;
    counts[band + 1]++;
  });

  // Counting sort into band order: `offsets[b]..offsets[b+1]` is band b.
  const offsets = new Int32Array(bandCount + 1);
  for (let band = 0; band < bandCount; band++) {
    offsets[band + 1] = offsets[band] + counts[band + 1];
  }
  const order = new Int32Array(size);
  const fill = offsets.slice(0, bandCount);
  for (let index = 0; index < size; index++) {
    order[fill[bands[index]]++] = index;
  }

  // cos(r bands) for the stop test, so it is a compare and not a cosine.
  const stopCosines = new Float64Array(bandCount + 2);
  for (let r = 0; r < stopCosines.length; r++) {
    stopCosines[r] = Math.cos(toRadians(Math.min(r * bandDegrees, 180)));
  }

  const scanBand = (band: number, vector: UnitVector, best: Nearest) => {
    const [qx, qy, qz] = vector;
    for (let slot = offsets[band]; slot < offsets[band + 1]; slot++) {
      const index = order[slot];
      const cosine = qx * xs[index] + qy * ys[index] + qz * zs[index];
      if (cosine > best.cosine) {
        best.index = index;
        best.cosine = cosine;
      }
    }
  };

  const nearest = (vector: UnitVector): Nearest => {
    if (size === 0) return { ...none };
    const latitude = (Math.asin(Math.min(Math.max(vector[2], -1), 1)) * 180) / Math.PI;
    const home = bandOf(latitude);
    const best: Nearest = { ...none };

    for (let r = 0; ; r++) {
      const below = home - r;
      const above = home + r;
      if (below < 0 && above >= bandCount) break;
      if (below >= 0) scanBand(below, vector, best);
      if (r > 0 && above < bandCount) scanBand(above, vector, best);
      // Everything not yet scanned is more than r bands of declination away.
      if (best.cosine >= stopCosines[r]) break;
    }
    return best;
  };

  return { size, nearest };
};
