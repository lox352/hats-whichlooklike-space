import { describe, expect, it } from "vitest";
import { getStitches } from "../helpers/stitches";
import type { SkyMarks } from "../types/SkyMarks";
import { bestTurn, sideView } from "./side-view";

/** A hat at its knitted positions, with a small figure of four stars on one side of it. */
const hat = getStitches(60, 12, "Hemispherical");
const onOneSide = hat.filter((stitch) => stitch.id > 300 && stitch.id < 700 && stitch.position.x > 0.5 * Math.hypot(stitch.position.x, stitch.position.z));
const figure = onOneSide.slice(0, 4).map((stitch) => stitch.id);
const sky: SkyMarks = {
  stars: figure,
  constellations: [{ abbreviation: "Ori", strokes: [{ points: figure.map((stitch) => ({ stitch, offHat: false })) }] }],
};

describe("the hat seen from the side", () => {
  it("turns its figure to face you", () => {
    const view = sideView(hat, sky);
    for (const id of figure) expect(view.dots.find((dot) => dot.id === id)!.front).toBe(true);
    expect(view.lines).toHaveLength(figure.length - 1);
  });

  it("hides a figure turned away", () => {
    const view = sideView(hat, sky, bestTurn(hat, sky) + Math.PI);
    expect(view.lines).toHaveLength(0);
  });

  it("draws far to near, every stitch once", () => {
    const view = sideView(hat, sky);
    expect(view.dots).toHaveLength(hat.length - 1);
    for (let k = 1; k < view.dots.length; k++) expect(view.dots[k].depth).toBeGreaterThanOrEqual(view.dots[k - 1].depth);
    for (const dot of view.dots) {
      expect(dot.lit).toBeGreaterThanOrEqual(0);
      expect(dot.lit).toBeLessThanOrEqual(1);
    }
  });
});
