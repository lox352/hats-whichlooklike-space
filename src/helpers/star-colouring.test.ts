import { describe, expect, it } from "vitest";
import {
  catalogueStar,
  colourSpace,
  maxSnapDegrees,
  starAtVertex,
  starMagnitudeLimit,
} from "./star-colouring";
import { constellations, stars } from "../data/sky-data";
import { getStitches } from "./stitches";
import {
  getGlobalCoordinates,
  rotateFromDestination,
  rotateToDestination,
} from "./sky-geometry";
import { angleBetween, toUnitVector } from "./sky-index";
import { GlobalCoordinates } from "../types/GlobalCoordinates";
import {
  defaultOrientationParameters,
  OrientationParameters,
} from "../types/OrientationParameters";
import { SkyPalette, yarnFor } from "./sky-palette";
import { segmentsOf } from "./connections";

/** The machine's idealised hat, as directions in hat space. */
const hat = (stitchesPerRow = 160, rows = 35) => {
  const stitches = getStitches(stitchesPerRow, rows, "Pyramidal");
  const maxY = Math.max(...stitches.map((stitch) => stitch.position.y));
  const coordinates = stitches.map((stitch) =>
    getGlobalCoordinates(stitch.position, maxY)
  );
  return { stitches, coordinates };
};

const orientedTo = (
  coordinates: GlobalCoordinates,
  targetDestination: OrientationParameters["targetDestination"] = "crown"
): OrientationParameters => ({
  ...defaultOrientationParameters,
  coordinates,
  targetDestination,
});

/*
 * The catalogue has no names. Its ids are Hipparcos numbers, so the famous
 * stars can still be asserted, and a regenerated asset that moved the sky
 * would fail here rather than silently.
 */
const knownStars = {
  Sirius: { hip: 32349, longitude: 101.2872, latitude: -16.7161, mag: -1.44 },
  Canopus: { hip: 30438, longitude: 95.988, latitude: -52.6957, mag: -0.62 },
  Arcturus: { hip: 69673, longitude: -146.0847, latitude: 19.1824, mag: -0.05 },
  Vega: { hip: 91262, longitude: -80.7653, latitude: 38.7837, mag: 0.03 },
  Rigel: { hip: 24436, longitude: 78.6345, latitude: -8.2016, mag: 0.18 },
  Polaris: { hip: 11767, longitude: 37.9545, latitude: 89.2641, mag: 1.97 },
  Acrux: { hip: 60718, longitude: -173.3504, latitude: -63.0991, mag: 0.77 },
  Mimosa: { hip: 62434, longitude: -168.0697, latitude: -59.6888, mag: 1.25 },
  Gacrux: { hip: 61084, longitude: -172.2085, latitude: -57.1132, mag: 1.59 },
  DeltaCrucis: { hip: 59747, longitude: -176.2137, latitude: -58.7489, mag: 2.79 },
};

describe("the star catalogue", () => {
  it("still holds the famous stars where they were", () => {
    for (const [name, star] of Object.entries(knownStars)) {
      const found = catalogueStar(star.hip);
      expect(found, name).toBeDefined();
      expect(found!.coordinates.longitude).toBeCloseTo(star.longitude, 4);
      expect(found!.coordinates.latitude).toBeCloseTo(star.latitude, 4);
      expect(found!.magnitude).toBeCloseTo(star.mag, 2);
    }
  });

  it("is the whole sky to magnitude six", () => {
    expect(stars.features.length).toBe(5044);
    expect(Math.max(...stars.features.map((star) => star.properties.mag))).toBe(6);
  });
});

describe("constellation vertices", () => {
  const vertices = constellations.features.flatMap((feature) =>
    feature.geometry.coordinates.flat()
  );
  const distinct = new Map(vertices.map((v) => [`${v[0]},${v[1]}`, v]));

  it("are, almost all of them, catalogue stars by exact coordinate", () => {
    const resolved = [...distinct.values()].filter((vertex) =>
      starAtVertex(vertex) !== undefined
    );
    // 754 of 757. The three that are not are near misses in the source data.
    expect(distinct.size).toBe(757);
    expect(resolved.length).toBe(754);
  });

  it("resolve Crux to its four named stars", () => {
    const crux = constellations.features.find((feature) => feature.id === "Cru")!;
    const hips = new Set(
      crux.geometry.coordinates.flat().map((vertex) => starAtVertex(vertex))
    );
    expect(hips).toEqual(
      new Set([
        knownStars.Acrux.hip,
        knownStars.Mimosa.hip,
        knownStars.Gacrux.hip,
        knownStars.DeltaCrucis.hip,
      ])
    );
  });

  it("include 313 stars fainter than the limit, which must still be lit", () => {
    const faint = [...distinct.values()].filter((vertex) => {
      const hip = starAtVertex(vertex);
      const star = hip === undefined ? undefined : catalogueStar(hip);
      return star !== undefined && star.magnitude >= starMagnitudeLimit;
    });
    expect(faint.length).toBe(313);
  });
});

describe("colourSpace", () => {
  const { coordinates } = hat();
  const stitchNearest = (
    sky: GlobalCoordinates,
    orientation: OrientationParameters
  ) => {
    // Where a sky point lands, by brute force, for the assertions to lean on.
    const v = toUnitVector(sky);
    let best = -1;
    let bestAngle = Infinity;
    coordinates.forEach((c, i) => {
      const angle = angleBetween(v, toUnitVector(rotateToDestination(c, orientation)));
      if (angle < bestAngle) {
        bestAngle = angle;
        best = i;
      }
    });
    return { index: best, angle: bestAngle };
  };

  it("uses exactly the three yarns", () => {
    const { colours } = colourSpace(coordinates, orientedTo(knownStars.Polaris));
    const yarns = new Set(colours.map((colour) => yarnFor(colour)));
    expect(yarns).toEqual(new Set(["Night", "MilkyWay", "Star"]));
    expect(colours.length).toBe(coordinates.length);
  });

  it("puts Polaris on the crown when the sky is oriented to it", () => {
    const orientation = orientedTo(knownStars.Polaris);
    const { colours, sky } = colourSpace(coordinates, orientation);
    const { index, angle } = stitchNearest(knownStars.Polaris, orientation);
    expect(angle).toBeLessThan(maxSnapDegrees);
    expect(sky.stars).toContain(index);
    expect(colours[index]).toEqual(SkyPalette.Star);
    // The crown stitch is the last one; Polaris should be on or beside it.
    const crown = coordinates.length - 1;
    const crownAngle = angleBetween(
      toUnitVector(rotateToDestination(coordinates[index], orientation)),
      toUnitVector(rotateToDestination(coordinates[crown], orientation))
    );
    expect(crownAngle).toBeLessThan(4);
  });

  /*
   * Crux straddles the ±180° seam, at longitudes -168 to -176. The old
   * search put its stars on the far side of the hat from each other.
   */
  it("keeps Crux in one piece across the seam", () => {
    const centre = { latitude: -60, longitude: -172 };
    const orientation = orientedTo(centre);
    const { sky } = colourSpace(coordinates, orientation);
    const placed = [
      knownStars.Acrux,
      knownStars.Mimosa,
      knownStars.Gacrux,
      knownStars.DeltaCrucis,
    ].map((star) => stitchNearest(star, orientation));
    // Four distinct stitches, all lit, all within a few degrees of the crown.
    expect(new Set(placed.map((p) => p.index)).size).toBe(4);
    for (const { index, angle } of placed) {
      expect(angle).toBeLessThan(maxSnapDegrees);
      expect(sky.stars).toContain(index);
    }
    const crux = sky.constellations.find((c) => c.abbreviation === "Cru")!;
    expect(crux).toBeDefined();
    const cruxStitches = new Set(
      crux.strokes.flatMap((stroke) => stroke.points.map((p) => p.stitch))
    );
    for (const { index } of placed) expect(cruxStitches).toContain(index);
    for (const stroke of crux.strokes) {
      for (const point of stroke.points) expect(point.offHat).toBe(false);
    }
  });

  it("lights every stitch a constellation passes through", () => {
    const { colours, sky } = colourSpace(coordinates, orientedTo(knownStars.Polaris));
    for (const constellation of sky.constellations) {
      for (const stroke of constellation.strokes) {
        for (const point of stroke.points) {
          if (point.offHat) continue;
          expect(sky.stars).toContain(point.stitch);
          expect(colours[point.stitch]).toEqual(SkyPalette.Star);
        }
      }
    }
  });

  it("only ever runs off the hat at the ends of a stroke", () => {
    const { sky } = colourSpace(coordinates, orientedTo({ latitude: 0, longitude: 0 }));
    let offHatEnds = 0;
    for (const constellation of sky.constellations) {
      for (const stroke of constellation.strokes) {
        const { points } = stroke;
        expect(points.length).toBeGreaterThanOrEqual(2);
        expect(points.some((p) => !p.offHat)).toBe(true);
        points.slice(1, -1).forEach((p) => expect(p.offHat).toBe(false));
        if (points[0].offHat) offHatEnds++;
        if (points[points.length - 1].offHat) offHatEnds++;
      }
    }
    // The brim is 133° from the crown, so only the far cap of sky is off the
    // hat - but some figures do cross into it, and this must exercise them.
    expect(offHatEnds).toBeGreaterThanOrEqual(10);
    // And so no segment has both ends off the hat.
    for (const segment of segmentsOf(sky)) {
      expect(segment.from.offHat && segment.to.offHat).toBe(false);
    }
  });

  it("treats the brim by dot product exactly as by rotating back", () => {
    const orientation = orientedTo({ latitude: 20, longitude: 140 }, "front");
    const brim = Math.min(...coordinates.map((c) => c.latitude));
    const { sky } = colourSpace(coordinates, orientation);
    // Every lit stitch is above the brim; every catalogue star above the brim
    // and bright enough lands on a lit stitch. Both ways round.
    const litFromCatalogue = stars.features
      .filter((star) => star.properties.mag < starMagnitudeLimit)
      .map((star) => ({
        latitude: star.geometry.coordinates[1],
        longitude: star.geometry.coordinates[0],
      }))
      .filter((star) => rotateFromDestination(star, orientation).latitude >= brim);
    for (const star of litFromCatalogue) {
      const { index, angle } = stitchNearest(star, orientation);
      if (angle < maxSnapDegrees) expect(sky.stars).toContain(index);
    }
  });

  it("can light stitch 0", () => {
    /*
     * Aim the sky so that Sirius sits exactly where stitch 0 looks. Stitch 0
     * is on the brim at hat longitude 180; with the "front" destination, a
     * vertical rotation by (its latitude - Sirius's) brings it to Sirius's
     * latitude, still at longitude 180, and then a spin by (Sirius's
     * longitude - 180) lines the longitudes up.
     */
    const first = coordinates[0];
    expect(Math.abs(first.longitude)).toBeCloseTo(180, 6);
    const orientation = orientedTo(
      {
        latitude: first.latitude - knownStars.Sirius.latitude,
        longitude: knownStars.Sirius.longitude - 180,
      },
      "front"
    );
    const lookingAt = rotateToDestination(first, orientation);
    expect(lookingAt.latitude).toBeCloseTo(knownStars.Sirius.latitude, 6);
    expect(lookingAt.longitude).toBeCloseTo(knownStars.Sirius.longitude, 6);
    const { sky } = colourSpace(coordinates, orientation);
    expect(sky.stars).toContain(0);
  });

  it("is deterministic", () => {
    const orientation = orientedTo(knownStars.Vega);
    const a = colourSpace(coordinates, orientation);
    const b = colourSpace(coordinates, orientation);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("charts a whole hat in well under a second", () => {
    const started = performance.now();
    colourSpace(coordinates, orientedTo(knownStars.Polaris));
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
