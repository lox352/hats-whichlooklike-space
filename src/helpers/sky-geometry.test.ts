import { describe, expect, it } from "vitest";
import {
  clampToUnit,
  getGlobalCoordinates,
  rotateFromDestination,
  rotateToDestination,
} from "./sky-geometry";
import {
  defaultOrientationParameters,
  OrientationParameters,
} from "../types/OrientationParameters";
import DestinationType from "../types/DestinationType";
import { angleBetween, toUnitVector } from "./sky-index";

/**
 * rotateToDestination maps *hat* coordinates onto the sky, so these tests
 * assert the inverse property that actually matters: the anchor point for the
 * chosen destination must land exactly on the coordinate the user picked.
 *
 * This is easy to "fix" into being wrong, hence the coverage.
 */
const hatAnchors: Record<
  DestinationType,
  { latitude: number; longitude: number }
> = {
  crown: { latitude: 90, longitude: 0 },
  front: { latitude: 0, longitude: 0 },
  rim: { latitude: -90, longitude: 0 },
};

const skyPoints = [
  { name: "the north celestial pole", latitude: 90, longitude: 0 },
  { name: "the south celestial pole", latitude: -90, longitude: 180 },
  { name: "Crux", latitude: -60, longitude: -172 },
  { name: "Vega", latitude: 38.78, longitude: -80.77 },
  { name: "the first point of Aries", latitude: 0, longitude: 0 },
  { name: "Orion's belt", latitude: -1.2, longitude: 84 },
];

const oriented = (
  place: { latitude: number; longitude: number },
  targetDestination: DestinationType,
): OrientationParameters => ({
  ...defaultOrientationParameters,
  coordinates: { latitude: place.latitude, longitude: place.longitude },
  targetDestination,
});

const destinations: DestinationType[] = ["crown", "front", "rim"];

describe("rotateToDestination", () => {
  destinations.forEach((destination) => {
    skyPoints.forEach((place) => {
      it(`carries the ${destination} anchor to ${place.name}`, () => {
        const result = rotateToDestination(
          hatAnchors[destination],
          oriented(place, destination),
        );
        expect(result.latitude).toBeCloseTo(place.latitude, 6);
        // At the poles longitude is degenerate, so only check it elsewhere.
        if (Math.abs(place.latitude) < 89.9) {
          expect(result.longitude).toBeCloseTo(place.longitude, 6);
        }
      });
    });
  });

  it("keeps longitude inside [-180, 180] when the rotation wraps", () => {
    const result = rotateToDestination(
      { latitude: 0, longitude: 170 },
      oriented({ latitude: 0, longitude: 170 }, "front"),
    );
    expect(result.longitude).toBeGreaterThanOrEqual(-180);
    expect(result.longitude).toBeLessThanOrEqual(180);
  });

  it("is a rotation: angles between points survive it", () => {
    const orientation = oriented({ latitude: -60, longitude: -172 }, "crown");
    const a = { latitude: 12, longitude: 34 };
    const b = { latitude: -20, longitude: 150 };
    const before = angleBetween(toUnitVector(a), toUnitVector(b));
    const after = angleBetween(
      toUnitVector(rotateToDestination(a, orientation)),
      toUnitVector(rotateToDestination(b, orientation)),
    );
    expect(after).toBeCloseTo(before, 6);
  });

  it("rejects an unknown destination rather than silently mis-orienting", () => {
    expect(() =>
      rotateToDestination(
        { latitude: 0, longitude: 0 },
        oriented({ latitude: 0, longitude: 0 }, "brim" as DestinationType),
      ),
    ).toThrow();
  });
});

describe("rotateFromDestination", () => {
  destinations.forEach((destination) => {
    skyPoints.forEach((place) => {
      it(`undoes rotateToDestination for ${destination} at ${place.name}`, () => {
        const orientation = oriented(place, destination);
        for (const latitude of [-80, -30, 0, 45, 80]) {
          for (const longitude of [-170, -60, 0, 90, 179]) {
            const there = rotateToDestination(
              { latitude, longitude },
              orientation,
            );
            const back = rotateFromDestination(there, orientation);
            // Compare as directions, so degenerate longitude at a pole is fine.
            const angle = angleBetween(
              toUnitVector({ latitude, longitude }),
              toUnitVector(back),
            );
            expect(angle).toBeLessThan(1e-6);
          }
        }
      });
    });
  });

  it("brings the chosen sky point back to the chosen anchor", () => {
    for (const destination of destinations) {
      for (const place of skyPoints) {
        const back = rotateFromDestination(place, oriented(place, destination));
        expect(back.latitude).toBeCloseTo(hatAnchors[destination].latitude, 6);
      }
    }
  });
});

describe("clampToUnit", () => {
  it.each([
    [0, 0],
    [1, 1],
    [-1, -1],
    [1.0000001, 1],
    [-2, -1],
    [5, 1],
  ])("clamps %s to %s", (input, expected) => {
    expect(clampToUnit(input)).toBe(expected);
  });

  it("maps non-finite input to zero rather than propagating NaN", () => {
    expect(clampToUnit(NaN)).toBe(0);
    expect(clampToUnit(Infinity)).toBe(1);
    expect(clampToUnit(-Infinity)).toBe(-1);
  });
});

describe("getGlobalCoordinates", () => {
  const maxY = 56;

  it("puts the top of the hat at the north pole", () => {
    const { latitude } = getGlobalCoordinates({ x: 0, y: maxY, z: 0 }, maxY);
    expect(latitude).toBeCloseTo(90, 6);
  });

  it("puts the equator halfway up", () => {
    const { latitude } = getGlobalCoordinates(
      { x: 50, y: maxY / 2, z: 0 },
      maxY,
    );
    expect(latitude).toBeCloseTo(0, 6);
  });

  /*
   * Unlike the earth branch, the brim is not forced to the south pole: the
   * hat is a sphere all the way down, so the brim sits where a point that far
   * out and that far down actually points. Changing this would move every
   * star on every hat.
   */
  it("puts the brim where the sphere says, not at the south pole", () => {
    const { latitude } = getGlobalCoordinates({ x: 50, y: 0, z: 0 }, maxY);
    const expected = (Math.atan2(-maxY / 2, 50) * 180) / Math.PI;
    expect(latitude).toBeCloseTo(expected, 6);
    expect(latitude).toBeGreaterThan(-90);
  });

  it("puts the seam at the back", () => {
    // Stitch 0 sits on the positive x axis, which is longitude 180.
    const { longitude } = getGlobalCoordinates(
      { x: 50, y: maxY / 2, z: 0 },
      maxY,
    );
    expect(Math.abs(longitude)).toBeCloseTo(180, 6);
  });

  it.each([-1, -5, -1000])(
    "returns a usable latitude for a stitch below the brim (y = %s)",
    (y) => {
      const { latitude, longitude } = getGlobalCoordinates(
        { x: 50, y, z: 0 },
        maxY,
      );
      expect(Number.isFinite(latitude)).toBe(true);
      expect(Number.isFinite(longitude)).toBe(true);
      expect(latitude).toBeGreaterThanOrEqual(-90);
      expect(latitude).toBeLessThanOrEqual(90);
    },
  );

  it("never returns out-of-range coordinates anywhere on a hat-shaped cloud", () => {
    for (let y = -10; y <= maxY + 10; y += 1.5) {
      for (let angle = 0; angle < 360; angle += 15) {
        const radians = (angle * Math.PI) / 180;
        const { latitude, longitude } = getGlobalCoordinates(
          { x: 50 * Math.cos(radians), y, z: 50 * Math.sin(radians) },
          maxY,
        );
        expect(Number.isFinite(latitude) && Number.isFinite(longitude)).toBe(
          true,
        );
        expect(latitude).toBeGreaterThanOrEqual(-90.000001);
        expect(latitude).toBeLessThanOrEqual(90.000001);
        expect(longitude).toBeGreaterThanOrEqual(-180.000001);
        expect(longitude).toBeLessThanOrEqual(180.000001);
      }
    }
  });

  it("tolerates a degenerate position at the origin", () => {
    const { latitude, longitude } = getGlobalCoordinates(
      { x: 0, y: 0, z: 0 },
      0,
    );
    expect(Number.isFinite(latitude)).toBe(true);
    expect(Number.isFinite(longitude)).toBe(true);
  });
});
