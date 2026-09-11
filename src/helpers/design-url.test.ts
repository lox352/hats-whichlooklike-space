import { describe, expect, it } from "vitest";
import {
  designFromSearchParams,
  designKey,
  designToSearchParams,
} from "./design-url";
import { defaultHatDesign, HatDesign } from "../types/HatDesign";

const wellington: HatDesign = {
  stitchesPerRow: 180,
  numberOfRows: 40,
  decreaseMethod: "Hemispherical",
  orientation: {
    coordinates: { latitude: -41.29, longitude: 174.78 },
    targetDestination: "front",
    magnitudeLimit: 4,
  },
};

const aNightInLondon: HatDesign = {
  ...defaultHatDesign,
  orientation: {
    coordinates: { latitude: 51.51, longitude: 12.34 },
    targetDestination: "crown",
    magnitudeLimit: 4,
  },
  source: {
    moment: { year: 2026, month: 9, day: 10, hour: 23, minute: 5 },
    place: { latitude: 51.51, longitude: -0.13 },
    zone: "Europe/London",
  },
};

describe("design URL round trip", () => {
  it.each([defaultHatDesign, wellington, aNightInLondon])(
    "survives a round trip",
    (design) => {
      const back = designFromSearchParams(designToSearchParams(design));
      expect(back).toEqual(design);
    }
  );

  it("produces a shareable query string", () => {
    const params = designToSearchParams(wellington);
    expect(params.get("sts")).toBe("180");
    expect(params.get("rows")).toBe("40");
    expect(params.get("dec")).toBe("Hemispherical");
    expect(params.get("lat")).toBe("-41.29");
    expect(params.get("lon")).toBe("174.78");
    expect(params.get("to")).toBe("front");
    expect(params.get("mag")).toBe("4");
  });

  it("keeps coordinates to a precision finer than a stitch", () => {
    const design = {
      ...wellington,
      orientation: {
        ...wellington.orientation,
        coordinates: { latitude: -41.2865432, longitude: 174.7762351 },
      },
    };
    const back = designFromSearchParams(designToSearchParams(design));
    expect(back.orientation.coordinates.latitude).toBeCloseTo(-41.29, 2);
    expect(back.orientation.coordinates.longitude).toBeCloseTo(174.78, 2);
  });
});

/**
 * A link is untrusted input. Every one of these used to be a way to get a
 * broken hat or a crash, so each falls back instead.
 */
describe("design URL is defensive", () => {
  it("falls back on an empty query string", () => {
    expect(designFromSearchParams(new URLSearchParams())).toEqual(
      defaultHatDesign
    );
  });

  it.each([
    "sts=abc",
    "sts=",
    "sts=NaN",
    "rows=Infinity",
    "rows=-5",
    "lat=hello",
    "lon=",
  ])("falls back on garbage: %s", (query) => {
    const design = designFromSearchParams(new URLSearchParams(query));
    expect(Number.isFinite(design.stitchesPerRow)).toBe(true);
    expect(Number.isFinite(design.numberOfRows)).toBe(true);
    expect(Number.isFinite(design.orientation.coordinates.latitude)).toBe(true);
    expect(Number.isFinite(design.orientation.coordinates.longitude)).toBe(true);
  });

  it("clamps coordinates into range", () => {
    const design = designFromSearchParams(
      new URLSearchParams("lat=999&lon=-999")
    );
    expect(design.orientation.coordinates.latitude).toBe(90);
    expect(design.orientation.coordinates.longitude).toBe(-180);
  });

  it("rejects an unknown decrease method or destination", () => {
    const design = designFromSearchParams(
      new URLSearchParams("dec=Spiral&to=brim")
    );
    expect(design.decreaseMethod).toBe(defaultHatDesign.decreaseMethod);
    expect(design.orientation.targetDestination).toBe(
      defaultHatDesign.orientation.targetDestination
    );
  });

  it("never returns a fractional stitch or row count", () => {
    const design = designFromSearchParams(
      new URLSearchParams("sts=160.7&rows=35.2")
    );
    expect(Number.isInteger(design.stitchesPerRow)).toBe(true);
    expect(Number.isInteger(design.numberOfRows)).toBe(true);
  });

  it("clamps the magnitude limit to the catalogue's range", () => {
    expect(
      designFromSearchParams(new URLSearchParams("mag=9")).orientation
        .magnitudeLimit
    ).toBe(6);
    expect(
      designFromSearchParams(new URLSearchParams("mag=-3")).orientation
        .magnitudeLimit
    ).toBe(0);
  });

  it("drops a night and place that do not parse, rather than guessing", () => {
    expect(
      designFromSearchParams(new URLSearchParams("when=yesterday&where=here"))
        .source
    ).toBeUndefined();
    expect(
      designFromSearchParams(new URLSearchParams("when=2026-13-40T25:61&where=0,0"))
        .source
    ).toBeUndefined();
    // Both halves are needed: a time with no place is not a sky.
    expect(
      designFromSearchParams(new URLSearchParams("when=2026-09-10T23:05")).source
    ).toBeUndefined();
  });

  it("reads a night and place back exactly", () => {
    const params = designToSearchParams(aNightInLondon);
    expect(params.get("when")).toBe("2026-09-10T23:05");
    expect(params.get("where")).toBe("51.51,-0.13");
    expect(params.get("tz")).toBe("Europe/London");
    expect(params.get("occ")).toBeNull();
    expect(designFromSearchParams(params).source).toEqual(aNightInLondon.source);
  });

  it("keeps the second reading of a repeated clock time", () => {
    const twice = {
      ...aNightInLondon,
      source: { ...aNightInLondon.source!, occurrence: 1 },
    };
    const back = designFromSearchParams(designToSearchParams(twice));
    expect(back.source?.occurrence).toBe(1);
  });
});

describe("designKey", () => {
  it("matches for equal designs and differs for different ones", () => {
    expect(designKey(wellington)).toBe(designKey({ ...wellington }));
    expect(designKey(wellington)).not.toBe(
      designKey({
        ...wellington,
        orientation: {
          ...wellington.orientation,
          magnitudeLimit: 5,
        },
      })
    );
    expect(designKey(aNightInLondon)).not.toBe(
      designKey({ ...aNightInLondon, source: undefined })
    );
  });
});
