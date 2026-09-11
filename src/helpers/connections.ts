import { SkyMarks, StrokePoint } from "../types/SkyMarks";

/** One straight run of embroidery between two stitches. */
export interface Segment {
  abbreviation: string;
  strokeIndex: number;
  segmentIndex: number;
  from: StrokePoint;
  to: StrokePoint;
}

/**
 * The constellation figures flattened to segments, for drawing.
 *
 * Every consecutive pair of points in a stroke is one segment. Strokes never
 * hold two off-hat points in a row, so at most one end of a segment is off
 * the hat, and it is flagged rather than encoded as a negative stitch id.
 */
export const segmentsOf = (sky: SkyMarks): Segment[] =>
  sky.constellations.flatMap(({ abbreviation, strokes }) =>
    strokes.flatMap((stroke, strokeIndex) =>
      stroke.points.slice(1).map((to, i) => ({
        abbreviation,
        strokeIndex,
        segmentIndex: i,
        from: stroke.points[i],
        to,
      })),
    ),
  );
