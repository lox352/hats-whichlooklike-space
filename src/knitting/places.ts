import type { SkyMarks } from "../types/SkyMarks";
import type { HatKnitting } from "./hat-knitting";
import type { ChartOverlay, OverlayLine } from "../ui/chart/chart-painter";
import { isStep } from "../pattern/Stitch";
import { segmentsOf } from "../helpers/connections";
import { segmentKey } from "../helpers/embroidery";

/**
 * The sky on the hat as the chart and the knitting panel ask it: by the
 * knitting's ids, which run one past the hat's own after the join (see
 * hat-knitting), where the sky is kept by the hat's.
 */

/** The constellation a stitch of the knitting is knitted in, where the hat knows. */
export const regionAt = (sky: SkyMarks, knitting: HatKnitting, id: number): string | undefined => {
  const own = knitting.hatIdOf(id);
  return own === undefined ? undefined : sky.regions?.[own];
};

/** The next stitch to knit after `progress`, past any step. */
export const nextStitch = (knitting: HatKnitting, progress: number): number | undefined => {
  let id = progress + 1;
  while (knitting.stitches[id] && isStep(knitting.stitches[id])) id++;
  return knitting.stitches[id] ? id : undefined;
};

/**
 * One constellation's sky drawn round on the chart, as the hat's chart
 * always has: the one you are knitting through, or the one a stitch tapped
 * is in, wherever its stitches fall.
 */
export const placeOutline = (
  sky: SkyMarks,
  knitting: HatKnitting,
  key: string,
  colours: { ink: string; halo: string },
): ChartOverlay["outline"] => ({ has: (id) => regionAt(sky, knitting, id) === key, ...colours });

export interface LineColours {
  figure: string;
  /** The line being sewn, and the halo it is drawn on. */
  active: string;
  halo: string;
}

/**
 * The constellation figures, as lines over the chart from star to star.
 *
 * While sewing, the line in hand is picked out in the accent on a halo, the
 * lines sewn are faint, and those still to sew are drawn as ever. A line that
 * runs off the brim is dashed, to where its missing star would be.
 */
export const skyLines = (
  sky: SkyMarks,
  knitting: HatKnitting,
  colours: LineColours,
  sewing?: { active?: string; sewn: Set<string> },
): OverlayLine[] =>
  segmentsOf(sky).map((segment) => {
    const key = segmentKey(segment);
    const active = sewing?.active === key;
    const sewn = sewing?.sewn.has(key);
    const offHat = segment.from.offHat || segment.to.offHat;
    return {
      from: knitting.idOfHat(segment.from.stitch),
      to: knitting.idOfHat(segment.to.stitch),
      fromBelow: segment.from.offHat,
      toBelow: segment.to.offHat,
      colour: active ? colours.active : colours.figure,
      width: active ? 3 : 1.6,
      alpha: sewing ? (active ? 1 : sewn ? 0.3 : 0.75) : offHat ? 0.6 : 0.9,
      dashed: offHat,
      ...(active ? { halo: colours.halo } : {}),
    };
  });
