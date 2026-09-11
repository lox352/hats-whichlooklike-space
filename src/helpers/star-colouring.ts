import { Position } from "geojson";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { constellations, milkyWay, stars } from "../data/sky-data";
import { constellationAt } from "./constellation-regions";
import { GlobalCoordinates } from "../types/GlobalCoordinates";
import { OrientationParameters } from "../types/OrientationParameters";
import { RGB } from "../types/RGB";
import {
  ConstellationMarks,
  SkyMarks,
  Stroke,
  StrokePoint,
} from "../types/SkyMarks";
import { rotateFromDestination, rotateToDestination } from "./sky-geometry";
import {
  buildSkyIndex,
  dot,
  SkyIndex,
  toUnitVector,
  UnitVector,
} from "./sky-index";
import { SkyPalette } from "./sky-palette";

/*
 * The projection: stars onto stitches.
 *
 * The earth branch asks, for each stitch, "what colour is the ground here?".
 * This branch cannot, because a star is a point and a stitch is an area: ask
 * a stitch what it looks at and the answer is almost always "nothing". So
 * the catalogue is walked instead, and each star is put on the stitch nearest
 * to it. The constellation figures are handled the same way, vertex by
 * vertex, and then joined up.
 */

/** Stars fainter than this are not knitted. Strict: 4.0 itself is out. */
export const starMagnitudeLimit = 4;

/**
 * A star further than this from every stitch is dropped rather than smeared
 * onto the nearest edge. Rows sit about 2.7° apart, so anything legitimately
 * on the hat is well within it; this is a guard, not a tuning.
 */
export const maxSnapDegrees = 3;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const coordinateKey = ([longitude, latitude]: Position) =>
  `${longitude.toFixed(4)},${latitude.toFixed(4)}`;

const toCoordinates = ([longitude, latitude]: Position): GlobalCoordinates => ({
  latitude,
  longitude,
});

interface CatalogueStar {
  /** The Hipparcos number, which is the only identity the catalogue carries. */
  hip: number;
  magnitude: number;
  coordinates: GlobalCoordinates;
  vector: UnitVector;
}

/*
 * The catalogue, prepared once. Every star's unit vector is computed here so
 * the projection pays no trig per star per hat.
 */
const catalogue: CatalogueStar[] = stars.features.map((feature) => {
  const coordinates = toCoordinates(feature.geometry.coordinates);
  return {
    hip: feature.id,
    magnitude: feature.properties.mag,
    coordinates,
    vector: toUnitVector(coordinates),
  };
});

/**
 * The catalogue by exact coordinate.
 *
 * The constellation figures do not reference stars by id; each vertex is a
 * bare coordinate. But the coordinates were written from the same catalogue,
 * and 754 of the 757 distinct vertices match a star to four decimal places.
 * So a vertex can be resolved to the star it is - and named - by lookup.
 */
const catalogueByKey = new Map(
  stars.features.map((feature) => [
    coordinateKey(feature.geometry.coordinates),
    feature.id,
  ]),
);

/**
 * The one Milky Way contour that is knitted: the outermost isophote, as one
 * pale band. The file carries four more, nested inside it, for if the band
 * ever wants to be tighter.
 */
const milkyWayBand = milkyWay.features.find(
  (feature) => feature.properties.id === "ol1",
);
if (!milkyWayBand) throw new Error("mw_simplified.json has no ol1 contour");

export interface ProjectionOptions {
  magnitudeLimit?: number;
}

/**
 * Which star, if any, a constellation vertex is.
 * Exported for the tests that pin the vertex-to-star resolution.
 */
export const starAtVertex = (vertex: Position): number | undefined =>
  catalogueByKey.get(coordinateKey(vertex));

/** The catalogue, for tests that assert known stars by their HIP number. */
export const catalogueStar = (hip: number): CatalogueStar | undefined =>
  catalogue.find((star) => star.hip === hip);

/**
 * Colour every stitch, and work out where the stars and constellations land.
 *
 * `hatCoordinates` are in hat space, one per stitch: the direction each
 * settled stitch faces. The orientation says which sky that hat is turned
 * towards.
 */
export const colourSpace = (
  hatCoordinates: GlobalCoordinates[],
  orientationParameters: OrientationParameters,
  options: ProjectionOptions = {},
): { colours: RGB[]; sky: SkyMarks } => {
  const magnitudeLimit = options.magnitudeLimit ?? starMagnitudeLimit;

  const skyCoordinates = hatCoordinates.map((coordinate) =>
    rotateToDestination(coordinate, orientationParameters),
  );
  const index = buildSkyIndex(skyCoordinates);

  /*
   * The brim, and the test for being above it.
   *
   * The hat covers the cap of sky within some angle of its crown: everything
   * whose hat-space latitude is at least the lowest stitch's. Rather than
   * rotate every star back into hat space to ask, the crown's direction in
   * the sky is found once, and a star is on the hat iff it is within the
   * cap's angular radius of it - one dot product against sin(brim latitude).
   * The two are equivalent because the orientation is a rotation.
   */
  const brimLatitude = hatCoordinates.reduce(
    (lowest, { latitude }) => Math.min(lowest, latitude),
    90,
  );
  const crown = toUnitVector(
    rotateToDestination({ latitude: 90, longitude: 0 }, orientationParameters),
  );
  const onHatCosine = Math.sin(toRadians(brimLatitude));
  const onHat = (vector: UnitVector) => dot(vector, crown) >= onHatCosine;
  const snapCosine = Math.cos(toRadians(maxSnapDegrees));

  const stitchNear = (vector: UnitVector): number => {
    const { index: stitch, cosine } = index.nearest(vector);
    return cosine >= snapCosine ? stitch : -1;
  };

  // 1. The ground: night, with the galaxy as one band across it.
  const colours: RGB[] = skyCoordinates.map(({ latitude, longitude }) =>
    booleanPointInPolygon([longitude, latitude], milkyWayBand)
      ? SkyPalette.MilkyWay
      : SkyPalette.Night,
  );

  // 2. The stars.
  const starStitches = new Set<number>();
  for (const star of catalogue) {
    if (star.magnitude >= magnitudeLimit) continue;
    if (!onHat(star.vector)) continue;
    const stitch = stitchNear(star.vector);
    if (stitch >= 0) starStitches.add(stitch);
  }

  /*
   * 3. The constellations.
   *
   * A vertex on the hat lands on its nearest stitch, and that stitch becomes
   * a star whether or not the catalogue star there is bright enough on its
   * own - 313 of the figures' 754 stars are fainter than the limit, and a
   * line that ends on an unlit stitch ends on nothing.
   *
   * A vertex below the brim cannot be sewn, but the line running towards it
   * can be shown leaving the hat. It is reflected about the brim, in hat
   * space, so it lands on the stitch the line would pass through on its way
   * off the edge, and flagged so nobody is asked to sew to it.
   */
  const placeVertex = (vertex: Position): StrokePoint | undefined => {
    const coordinates = toCoordinates(vertex);
    const vector = toUnitVector(coordinates);
    if (onHat(vector)) {
      const stitch = stitchNear(vector);
      if (stitch < 0) return undefined;
      starStitches.add(stitch);
      return { stitch, offHat: false };
    }
    const inHatSpace = rotateFromDestination(
      coordinates,
      orientationParameters,
    );
    const reflected = rotateToDestination(
      {
        latitude: 2 * brimLatitude - inHatSpace.latitude,
        longitude: inHatSpace.longitude,
      },
      orientationParameters,
    );
    const stitch = stitchNear(toUnitVector(reflected));
    return stitch < 0 ? undefined : { stitch, offHat: true };
  };

  /*
   * A figure's line becomes strokes: runs of the needle. Only the first and
   * last point of a stroke may be off the hat, and a segment with both ends
   * off the hat is not drawn at all.
   */
  const strokesOf = (line: Position[]): Stroke[] => {
    const strokes: Stroke[] = [];
    let current: StrokePoint[] = [];
    const flush = () => {
      // A stroke is a line: two points at least, one of them on the hat.
      if (current.length >= 2 && current.some((point) => !point.offHat)) {
        strokes.push({ points: current });
      }
    };
    for (const vertex of line) {
      const point = placeVertex(vertex);
      if (!point) {
        flush();
        current = [];
      } else if (point.offHat) {
        current.push(point);
        flush();
        current = [point];
      } else {
        current.push(point);
      }
    }
    flush();
    return strokes;
  };

  const marks: ConstellationMarks[] = [];
  for (const feature of constellations.features) {
    const strokes = feature.geometry.coordinates.flatMap(strokesOf);
    if (strokes.length > 0) {
      marks.push({ abbreviation: feature.id, strokes });
    }
  }

  const starList = [...starStitches].sort((a, b) => a - b);
  for (const stitch of starList) colours[stitch] = SkyPalette.Star;

  // 3. The label on every stitch: which constellation's sky it faces.
  const regions = Object.fromEntries(
    skyCoordinates
      .map((coordinate, id) => [id, coordinate] as const)
      .filter(([id]) => id > 0)
      .map(([id, coordinate]) => [id, constellationAt(coordinate)]),
  );

  return {
    colours,
    sky: { stars: starList, constellations: marks, regions },
  };
};

/** For tests and diagnostics: which stitch each catalogue star lands on. */
export const projectCatalogue = (
  index: SkyIndex,
): { hip: number; stitch: number; cosine: number }[] =>
  catalogue.map((star) => {
    const { index: stitch, cosine } = index.nearest(star.vector);
    return { hip: star.hip, stitch, cosine };
  });
