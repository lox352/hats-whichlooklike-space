import { beforeEach, describe, expect, it } from "vitest";
import {
  sewingGroups,
  completedSegments,
  selectedSegment,
  markSegment,
} from "./embroidery";
import { SkyMarks, noEmbroidery } from "../types/SkyMarks";
import { getStitches } from "./stitches";
import {
  createPattern,
  readPattern,
  setEmbroidery,
  setProgress,
} from "./pattern-storage";
const stitches = getStitches(40, 8, "Pyramidal");
const point = (stitch: number, offHat = false) => ({ stitch, offHat });
const sky: SkyMarks = {
  stars: [1, 2, 3, 4],
  constellations: [
    {
      abbreviation: "Tri",
      strokes: [
        { points: [point(1), point(2)] },
        { points: [point(4), point(3)] },
        { points: [point(2), point(3)] },
        { points: [point(3), point(4)] },
        { points: [point(4), point(5, true)] },
        { points: [point(4), point(4)] },
        { points: [point(0), point(1)] },
      ],
    },
  ],
};
beforeEach(() => localStorage.clear());
describe("guided embroidery", () => {
  it("walks connected segments in needle order while retaining source identities", () => {
    const [g] = sewingGroups(sky, stitches);
    expect(g.segments.map((s) => [s.from, s.to])).toEqual([
      [1, 2],
      [2, 3],
      [3, 4],
    ]);
    expect(g.segments.map((s) => s.key)).toEqual([
      "Tri:0:0",
      "Tri:2:0",
      "Tri:1:0",
    ]);
    expect(g.offHatCount).toBe(1);
  });
  it("omits duplicate, zero-length, phantom and missing-stitch segments", () => {
    const [g] = sewingGroups(sky, stitches);
    expect(g.segments).toHaveLength(3);
    expect(g.segments.every((s) => s.from > 0 && s.to > 0)).toBe(true);
    expect(sewingGroups(sky, [])).toEqual([]);
  });
  it("expands the earlier stroke-level progress without inventing completed segments", () => {
    const groups = sewingGroups(sky, stitches);
    expect([
      ...completedSegments(groups, { done: ["Tri:2", "nonexistent"] }),
    ]).toEqual(["Tri:2:0"]);
  });
  it("advances, completes and can undo a constellation", () => {
    const groups = sewingGroups(sky, stitches);
    let progress = noEmbroidery();
    const first = selectedSegment(groups, progress)!;
    const before = progress;
    progress = markSegment(groups, progress, first.key, true);
    expect(selectedSegment(groups, progress)?.key).not.toBe(first.key);
    expect(completedSegments(groups, before).size).toBe(0);
    for (const s of groups[0].segments)
      progress = markSegment(groups, progress, s.key, true);
    expect(selectedSegment(groups, progress)).toBeUndefined();
    progress = markSegment(groups, progress, first.key, false);
    expect(selectedSegment(groups, progress)?.key).toBe(first.key);
  });
  it("persists sewing independently of knit progress, including selected segment", () => {
    const { pattern } = createPattern(stitches, sky, "Triangle");
    setProgress(pattern.id, 17);
    const progress = { done: ["Tri:0:0"], current: "Tri", segment: "Tri:2:0" };
    setEmbroidery(pattern.id, progress);
    expect(readPattern(pattern.id)?.progress).toBe(17);
    expect(readPattern(pattern.id)?.embroidery).toEqual(progress);
    setProgress(pattern.id, 20);
    expect(readPattern(pattern.id)?.embroidery).toEqual(progress);
  });
  it("does not sew a constellation with only off-brim guides", () => {
    expect(
      sewingGroups(
        {
          stars: [],
          constellations: [
            {
              abbreviation: "Cru",
              strokes: [{ points: [point(1), point(2, true)] }],
            },
          ],
        },
        stitches,
      ),
    ).toEqual([]);
  });
});
