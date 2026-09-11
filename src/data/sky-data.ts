import type {
  Feature,
  FeatureCollection,
  MultiLineString,
  MultiPolygon,
  Point,
  Polygon,
} from "geojson";
import starsJson from "../assets/stars.6.json";
import constellationsJson from "../assets/constellations.lines.json";
import milkyWayJson from "../assets/mw_simplified.json";

/*
 * The three sky assets, typed by what is actually in them.
 *
 * TypeScript infers a JSON import's type from its contents, which is honest
 * but loose: every `"type": "Feature"` comes back as `string`, so nothing
 * downstream can accept it as GeoJSON. These casts say what the files are,
 * in the one place the files are read, and the tests check they hold.
 */

/** A collection whose features carry a typed, required id. */
type Collection<G extends Point | MultiLineString, P, Id> = Omit<
  FeatureCollection<G, P>,
  "features"
> & { features: (Feature<G, P> & { id: Id })[] };

/**
 * d3-celestial's stars to magnitude 6, stripped to magnitude and colour
 * index. The id is the Hipparcos catalogue number.
 */
export type StarCatalogue = Collection<
  Point,
  { mag: number; bv: string },
  number
>;

/** The IAU constellation figures. `id` is the three-letter abbreviation. */
export type ConstellationLines = Collection<
  MultiLineString,
  { rank: string },
  string
>;

/** Five nested Milky Way isophotes, `ol1` (outermost) to `ol5`. */
export type MilkyWayContours = FeatureCollection<
  Polygon | MultiPolygon,
  { id: string }
>;

export const stars = starsJson as unknown as StarCatalogue;
export const constellations =
  constellationsJson as unknown as ConstellationLines;
export const milkyWay = milkyWayJson as unknown as MilkyWayContours;
