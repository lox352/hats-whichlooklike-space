/**
 * What the sky put on the hat: which stitches are stars, and how the
 * constellations join them.
 *
 * Held once per hat, beside the stitches, rather than inside each stitch.
 * It used to live on every stitch as `starInfo`, carrying a `Map` - which
 * meant every stitch had to be hand-stringified to survive JSON, saved
 * patterns stored stitches as strings, and the knitting machine had to know
 * about stars at five construction sites. None of that is the stitch's
 * business: the projection produces this in one pass, index-parallel to the
 * stitches, so that is the shape it keeps.
 */
export interface SkyMarks {
  /** Ids of the stitches carrying a star. */
  stars: number[];
  constellations: ConstellationMarks[];
}

export interface ConstellationMarks {
  /** IAU abbreviation, e.g. "Cru". A key into data/constellation-names. */
  abbreviation: string;
  /** The figure, as runs of the needle: each stroke is sewn without a cut. */
  strokes: Stroke[];
}

export interface Stroke {
  points: StrokePoint[];
}

export interface StrokePoint {
  /**
   * The stitch the vertex sits on. For a vertex below the brim, the stitch
   * its reflection about the brim lands on, so a tail can be drawn towards
   * where the line leaves the hat.
   */
  stitch: number;
  /** True when the real vertex is below the brim and cannot be sewn. */
  offHat: boolean;
}

/**
 * Which strokes have been sewn.
 *
 * A set, not a high-water mark. Knitting is one number because a stitch
 * cannot exist before the one under it; embroidery has no such order - Orion
 * before Crux is perfectly reasonable - so a counter would make "did those
 * two, not the twelve between" unrepresentable.
 */
export interface EmbroideryProgress {
  /** Finished strokes, as "abbreviation:strokeIndex". */
  done: string[];
  /** The constellation being sewn, if one is in hand. */
  current?: string;
}

export const strokeKey = (abbreviation: string, strokeIndex: number): string =>
  `${abbreviation}:${strokeIndex}`;

export const emptySky = (): SkyMarks => ({ stars: [], constellations: [] });
export const noEmbroidery = (): EmbroideryProgress => ({ done: [] });
