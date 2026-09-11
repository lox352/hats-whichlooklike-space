import { Point } from "../types/Point";
import { type RGB } from "../types/RGB";
import { OrientationParameters } from "../types/OrientationParameters";
import { SkyMarks } from "../types/SkyMarks";
import { getGlobalCoordinates } from "./sky-geometry";
import { colourSpace } from "./star-colouring";

export interface SkyColouring {
  colours: RGB[];
  sky: SkyMarks;
}

/**
 * Colour every settled stitch position in one pass, and record where the
 * stars and constellations landed.
 */
export const colourNodes = (
  positions: Point[],
  orientationParameters: OrientationParameters,
): SkyColouring => {
  const maxY = positions.reduce((max, { y }) => (y > max ? y : max), 0);
  const hatCoordinates = positions.map((position) =>
    getGlobalCoordinates(position, maxY),
  );
  return colourSpace(hatCoordinates, orientationParameters, {
    magnitudeLimit: orientationParameters.magnitudeLimit,
  });
};
