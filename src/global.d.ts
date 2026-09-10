import type { FeatureCollection, MultiLineString, MultiPolygon, Point, Polygon } from "geojson";

/*
 * The three sky assets, typed by what is actually in them. A blanket
 * `*.json: any` declaration used to cover these, which switched type
 * checking off for every field read from any of them.
 */
declare module "*/stars.6.json" {
  /** `bv` is a string in the file, and two records have it empty. */
  const stars: FeatureCollection<Point, { mag: number; bv: string }> & {
    features: { id: number }[];
  };
  export default stars;
}

declare module "*/constellations.lines.json" {
  const lines: FeatureCollection<MultiLineString, { rank: string }> & {
    features: { id: string }[];
  };
  export default lines;
}

declare module "*/mw_simplified.json" {
  const milkyWay: FeatureCollection<Polygon | MultiPolygon, { id: string }>;
  export default milkyWay;
}
