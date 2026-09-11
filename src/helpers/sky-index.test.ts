import { describe, expect, it } from "vitest";
import seedrandom from "seedrandom";
import {
  angleBetween,
  buildSkyIndex,
  dot,
  nearestByBruteForce,
  toUnitVector,
  UnitVector,
} from "./sky-index";
import { GlobalCoordinates } from "../types/GlobalCoordinates";
import { getStitches } from "./stitches";
import { getGlobalCoordinates } from "./sky-geometry";

/** A real hat's stitch directions, from the machine's idealised positions. */
const hatCoordinates = (stitchesPerRow = 160, rows = 35): GlobalCoordinates[] => {
  const stitches = getStitches(stitchesPerRow, rows, "Pyramidal");
  const maxY = Math.max(...stitches.map((stitch) => stitch.position.y));
  return stitches.map((stitch) => getGlobalCoordinates(stitch.position, maxY));
};

const randomSky = (count: number, seed: string): GlobalCoordinates[] => {
  const random = seedrandom(seed);
  return Array.from({ length: count }, () => ({
    // Uniform on the sphere, not uniform in latitude.
    latitude: (Math.asin(2 * random() - 1) * 180) / Math.PI,
    longitude: random() * 360 - 180,
  }));
};

describe("angular distance by dot product", () => {
  it("is zero at identity and 180 between poles", () => {
    const a = toUnitVector({ latitude: 12, longitude: 34 });
    expect(angleBetween(a, a)).toBeCloseTo(0, 6);
    const north = toUnitVector({ latitude: 90, longitude: 0 });
    const south = toUnitVector({ latitude: -90, longitude: 0 });
    expect(angleBetween(north, south)).toBeCloseTo(180, 6);
  });

  it("is a quarter turn from the equator to the pole", () => {
    const equator = toUnitVector({ latitude: 0, longitude: 0 });
    const pole = toUnitVector({ latitude: 90, longitude: 0 });
    expect(angleBetween(equator, pole)).toBeCloseTo(90, 6);
  });

  /*
   * The two things the old planar metric got wrong, pinned. It scored the
   * first of these at 358 and the second at 20 versus 2, picking the wrong
   * neighbour both times.
   */
  it("has no seam at ±180°", () => {
    const east = toUnitVector({ latitude: 0, longitude: 179 });
    const west = toUnitVector({ latitude: 0, longitude: -179 });
    expect(angleBetween(east, west)).toBeCloseTo(2, 6);
  });

  it("does not stretch longitude near the pole", () => {
    const here = toUnitVector({ latitude: 88, longitude: 0 });
    const alongTheParallel = toUnitVector({ latitude: 88, longitude: 20 });
    const downTheMeridian = toUnitVector({ latitude: 86, longitude: 0 });
    // 20° of longitude at latitude 88 is well under a degree of sky.
    expect(angleBetween(here, alongTheParallel)).toBeLessThan(1);
    expect(angleBetween(here, downTheMeridian)).toBeCloseTo(2, 6);
  });
});

describe("buildSkyIndex", () => {
  const coordinates = hatCoordinates();
  const index = buildSkyIndex(coordinates);

  // The reference, with the stitch vectors computed once rather than once
  // per query, so ten thousand queries do not mean seventy million cosines.
  const vectors = coordinates.map(toUnitVector);
  const bruteForce = (vector: UnitVector) => {
    let best = -Infinity;
    for (const candidate of vectors) best = Math.max(best, dot(vector, candidate));
    return best;
  };

  it("has a reference that agrees with the exported one", () => {
    const vector = toUnitVector({ latitude: 10, longitude: 20 });
    expect(bruteForce(vector)).toBeCloseTo(nearestByBruteForce(vector, coordinates).cosine, 12);
  });

  it("indexes every stitch", () => {
    expect(index.size).toBe(coordinates.length);
    expect(coordinates.length).toBeGreaterThan(7000);
  });

  /*
   * The load-bearing test: the index is an optimisation, not a behaviour.
   * Distances are compared rather than indices, because two stitches can be
   * exactly equidistant and the two searches may break the tie differently.
   */
  it("agrees with brute force over ten thousand random sky points", () => {
    for (const point of randomSky(10000, "sky")) {
      const vector = toUnitVector(point);
      expect(index.nearest(vector).cosine).toBeCloseTo(bruteForce(vector), 12);
    }
  });

  it("finds every stitch from its own direction", () => {
    // A perfect hit. Not necessarily the same index: the join stitch shares
    // its position with the stitch it joins to, and either is right.
    coordinates.forEach((coordinate) => {
      const found = index.nearest(toUnitVector(coordinate));
      expect(found.cosine).toBeCloseTo(1, 12);
      expect(coordinates[found.index].latitude).toBeCloseTo(coordinate.latitude, 9);
      expect(coordinates[found.index].longitude).toBeCloseTo(coordinate.longitude, 9);
    });
  });

  it("can return stitch 0", () => {
    // The old code tested `if (!index)`, which made stitch 0 unreachable.
    const found = index.nearest(toUnitVector(coordinates[0]));
    expect(found.index).toBe(0);
  });

  it("finds something for a point far from every stitch", () => {
    // Below the brim, in a direction nothing faces: still the nearest one.
    const vector = toUnitVector({ latitude: -89, longitude: 0 });
    const found = index.nearest(vector);
    expect(found.index).toBeGreaterThanOrEqual(0);
    expect(found.cosine).toBeCloseTo(bruteForce(vector), 12);
  });

  it("handles queries on band edges and at the poles", () => {
    for (const latitude of [-90, -88, -2, 0, 2, 88, 90]) {
      for (const longitude of [-180, -90, 0, 90, 179.999]) {
        const vector = toUnitVector({ latitude, longitude });
        expect(index.nearest(vector).cosine).toBeCloseTo(bruteForce(vector), 12);
      }
    }
  });

  it("returns nothing for an empty index", () => {
    expect(buildSkyIndex([]).nearest([0, 0, 1]).index).toBe(-1);
  });

  it("is the same answer whatever the band width", () => {
    const coarse = buildSkyIndex(coordinates, 7);
    const fine = buildSkyIndex(coordinates, 0.5);
    for (const point of randomSky(500, "bands")) {
      const vector = toUnitVector(point);
      expect(coarse.nearest(vector).cosine).toBeCloseTo(fine.nearest(vector).cosine, 12);
    }
  });
});

/*
 * Kept apart from correctness so a slow runner reads as slow, not wrong. The
 * ceiling is generous: the old search was ~38 million square roots for the
 * same work, and this needs to fit inside the settle without a stall.
 */
describe("buildSkyIndex speed", () => {
  it("answers the whole catalogue's worth of queries quickly", () => {
    const coordinates = hatCoordinates();
    const queries = randomSky(5044, "catalogue").map(toUnitVector);
    const started = performance.now();
    const index = buildSkyIndex(coordinates);
    for (const query of queries) index.nearest(query);
    expect(performance.now() - started).toBeLessThan(250);
  });
});
