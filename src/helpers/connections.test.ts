import { describe, expect, it } from "vitest";
import { segmentsOf } from "./connections";
import { SkyMarks } from "../types/SkyMarks";

const sky: SkyMarks = {
  stars: [1, 2, 3, 9],
  constellations: [
    {
      abbreviation: "Tri",
      strokes: [
        {
          points: [
            { stitch: 1, offHat: false },
            { stitch: 2, offHat: false },
            { stitch: 3, offHat: false },
          ],
        },
        {
          points: [
            { stitch: 3, offHat: false },
            { stitch: 40, offHat: true },
          ],
        },
      ],
    },
    { abbreviation: "Dot", strokes: [] },
  ],
};

describe("segmentsOf", () => {
  it("makes one segment per consecutive pair in a stroke", () => {
    const segments = segmentsOf(sky);
    expect(segments.map((s) => [s.from.stitch, s.to.stitch])).toEqual([
      [1, 2],
      [2, 3],
      [3, 40],
    ]);
  });

  it("carries the constellation and stroke each segment belongs to", () => {
    const [first, , last] = segmentsOf(sky);
    expect(first.abbreviation).toBe("Tri");
    expect(first.strokeIndex).toBe(0);
    expect(last.strokeIndex).toBe(1);
  });

  it("keeps the off-hat flag on the end that has it", () => {
    const [, , offEdge] = segmentsOf(sky);
    expect(offEdge.from.offHat).toBe(false);
    expect(offEdge.to.offHat).toBe(true);
  });

  it("gives nothing for an empty sky", () => {
    expect(segmentsOf({ stars: [], constellations: [] })).toEqual([]);
  });
});
