import { describe, expect, it } from "vitest";
import { constellationAt, regionsForStitches } from "./constellation-regions";
import {
  currentRegion,
  regionCounts,
  regionInfo,
  regionOutline,
} from "./constellation-guide";
import reference from "./__fixtures__/constellation-regions.json";
import { emptySky } from "../types/SkyMarks";
import { defaultOrientationParameters } from "../types/OrientationParameters";
import { getStitches } from "./stitches";

describe("constellationAt", () => {
  it("agrees with Astropy at every reference point, across all 88 regions", () => {
    const seen = new Set<string>();
    for (const [ra, dec, expected] of reference.points) {
      const actual = constellationAt({
        longitude: Number(ra),
        latitude: Number(dec),
      });
      expect(actual, `J2000 ${ra}°, ${dec}°`).toBe(expected);
      seen.add(actual);
    }
    expect(seen.size).toBe(88);
  });

  it("covers both poles and wraps the longitude seam", () => {
    expect(constellationAt({ latitude: 90, longitude: 0 })).toBe("UMi");
    expect(constellationAt({ latitude: -90, longitude: 0 })).toBe("Oct");
    expect(constellationAt({ latitude: 0, longitude: 180 })).toBe(
      constellationAt({ latitude: 0, longitude: -180 }),
    );
    expect(constellationAt({ latitude: 0, longitude: 0 })).toBe(
      constellationAt({ latitude: 0, longitude: 360 }),
    );
  });

  it("knows the bright stars' homes", () => {
    // Sirius, Betelgeuse, Alpha Centauri, Polaris, Acrux.
    expect(constellationAt({ longitude: 101.287, latitude: -16.716 })).toBe("CMa");
    expect(constellationAt({ longitude: 88.793, latitude: 7.407 })).toBe("Ori");
    expect(constellationAt({ longitude: 219.902, latitude: -60.834 })).toBe("Cen");
    expect(constellationAt({ longitude: 37.955, latitude: 89.264 })).toBe("UMi");
    expect(constellationAt({ longitude: 186.650, latitude: -63.099 })).toBe("Cru");
  });

  it("rejects a direction that is not on the sky", () => {
    expect(() => constellationAt({ latitude: 91, longitude: 0 })).toThrow();
    expect(() => constellationAt({ latitude: 0, longitude: NaN })).toThrow();
  });
});

describe("regionsForStitches", () => {
  it("labels every knitted stitch and not the phantom", () => {
    const stitches = getStitches(40, 4, "Pyramidal");
    const regions = regionsForStitches(stitches, defaultOrientationParameters);
    expect(Object.keys(regions)).toHaveLength(stitches.length - 1);
    expect(regions[0]).toBeUndefined();
    for (const label of Object.values(regions)) {
      expect(regionInfo(label)).toBeDefined();
    }
  });
});

describe("the guide", () => {
  it("names a region and says what the name means", () => {
    expect(regionInfo("Ori")).toMatchObject({
      name: "Orion",
      meaning: "the Hunter",
    });
    expect(regionInfo("Ser")?.name).toBe("Serpens");
    expect(regionInfo("Nope")).toBeUndefined();
  });

  it("counts the stitches and stars in each region", () => {
    const stitches = getStitches(40, 4, "Pyramidal");
    const sky = {
      ...emptySky(),
      stars: [1, 3],
      regions: { 1: "Ori", 2: "Ori", 3: "Tau" },
    };
    expect(regionCounts(stitches, sky)).toEqual([
      { abbreviation: "Ori", stitches: 2, stars: 1 },
      { abbreviation: "Tau", stitches: 1, stars: 1 },
    ]);
    expect(regionCounts(stitches, emptySky())).toEqual([]);
  });

  it("follows the next stitch and stops at the end", () => {
    const sky = { ...emptySky(), regions: { 1: "Ori", 2: "Tau" } };
    expect(currentRegion(sky, 0, 2)).toBe("Ori");
    expect(currentRegion(sky, 1, 2)).toBe("Tau");
    expect(currentRegion(sky, 2, 2)).toBeUndefined();
    expect(currentRegion(emptySky(), 0, 2)).toBeUndefined();
  });

  it("outlines a region without its internal edges", () => {
    const positions = {
      1: { row: 0, col: 0 },
      2: { row: 0, col: -1 },
      3: { row: -1, col: 0 },
    };
    const path = regionOutline(
      { 1: "Ori", 2: "Ori", 3: "Tau" },
      positions,
      2,
      2,
      10,
      "Ori",
    );
    // The edge shared by cells 1 and 2 is not drawn.
    expect(path).not.toContain("M10,10v10");
    // The boundary with Tau, above cell 1, is.
    expect(path).toContain("M10,10h10");
    expect(regionOutline({}, positions, 2, 2, 10, "Ori")).toBe("");
  });
});
