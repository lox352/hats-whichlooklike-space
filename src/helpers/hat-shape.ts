import { Stitch } from "../types/Stitch";
import { verticalStitchDistance } from "../constants";
import { indexRows } from "./knitting-progress";

/**
 * How big the hat will be once it has settled, worked out before it has.
 *
 * The camera needs this up front. Framing from the hat's measured bounds meant
 * moving the camera when the shape changed, and any movement there reads badly:
 * either a jump, or an ease that fights you if you try to turn the hat while it
 * is still going.
 *
 * Two of the three numbers are exact rather than predicted:
 *
 *  - The radius is the cast-on circle, taken straight from the stitches. The
 *    cast-on row is pinned in place and is the widest part of the hat, so this
 *    is not an estimate.
 *  - The row count comes from the chart layout, so it counts the crown's rows
 *    as well as the body's.
 *
 * Only the height is predicted, and it has to be: how far the tube inflates is
 * the result of the simulation. See settledHeight.
 */

export interface HatShape {
  /** Distance from the axis to the brim. */
  radius: number;
  /** Brim to crown, in the same units as the stitch positions. */
  height: number;
  rows: number;
}

/**
 * Space-specific fit, measured on 80×20, 130×25, 160×35 and 200×45
 * pyramidal hats with the fixed-step solver. The earth coefficient (0.781)
 * overestimated these heights by 2.8–4.5%. Fitting normalised height against
 * squared radius/fabric-length gives 0.869, within 1.7% of all four.
 * Raw measurements and timings are in space-hat-measurements.json.
 * This predicts framing only; it never changes the projection or physics.
 */
const inflationCoefficient = 0.869;

/**
 * Beyond this ratio the fit would predict a hat of no height at all. It
 * corresponds to a tube far wider than it is long, which is not a hat anyone
 * will knit, but the camera still has to be pointed somewhere.
 */
const widestUsefulRatio = 1.1;

export const settledHeight = (radius: number, rows: number): number => {
  const fabricLength = verticalStitchDistance * Math.max(rows, 1);
  if (fabricLength <= 0) return 0;
  const ratio = Math.min(Math.max(radius / fabricLength, 0), widestUsefulRatio);
  const fraction = Math.max(1 - inflationCoefficient * ratio * ratio, 0.05);
  return fabricLength * fraction;
};

/** Radius of the cast-on circle: the fixed stitches at the start of the hat. */
export const castOnRadius = (stitches: Stitch[]): number => {
  let widest = 0;
  for (const stitch of stitches) {
    // The cast-on row and the join are the fixed ones; past those the hat is
    // free to move and its positions are only a starting guess.
    if (!stitch.fixed) break;
    const { x, z } = stitch.position;
    const distance = Math.hypot(x, z);
    if (distance > widest) widest = distance;
  }
  return widest;
};

export const predictHatShape = (stitches: Stitch[]): HatShape => {
  if (stitches.length === 0) return { radius: 1, height: 1, rows: 0 };

  const rows = Math.max(indexRows(stitches).totalRows, 1);
  const radius = Math.max(castOnRadius(stitches), 0.001);
  return { radius, height: settledHeight(radius, rows), rows };
};
