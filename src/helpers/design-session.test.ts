import { beforeEach, expect, it } from "vitest";
import { cacheHat, readHat } from "./design-session";
import { designFromSearchParams, designToSearchParams } from "./design-url";
import { defaultHatDesign } from "../types/HatDesign";
import { getStitches } from "./stitches";
import { emptySky } from "../types/SkyMarks";
import { constellationNames } from "../data/constellation-names";
import catalogue from "../assets/constellations.lines.json";
beforeEach(() => sessionStorage.clear());
it("round trips sky orientation and magnitude in a URL", () => {
  const design = {
    ...defaultHatDesign,
    orientation: {
      ...defaultHatDesign.orientation,
      magnitudeLimit: 5.5,
      coordinates: { latitude: -60, longitude: 179.9 },
    },
  };
  expect(designFromSearchParams(designToSearchParams(design))).toEqual(design);
});
it("caches sky and stitches together and rejects another design", () => {
  const stitches = getStitches(40, 4, "Pyramidal"),
    sky = emptySky();
  cacheHat(defaultHatDesign, stitches, sky);
  expect(readHat(defaultHatDesign)?.sky).toEqual(sky);
  expect(readHat({ ...defaultHatDesign, numberOfRows: 99 })).toBeUndefined();
});
it("recovers from corrupt cache", () => {
  sessionStorage.setItem("space-current-hat", "{");
  expect(readHat(defaultHatDesign)).toBeUndefined();
});
it("names every figure in the catalogue", () => {
  expect(catalogue.features).toHaveLength(89);
  for (const c of catalogue.features)
    expect(constellationNames[c.id]).toBeTruthy();
});
