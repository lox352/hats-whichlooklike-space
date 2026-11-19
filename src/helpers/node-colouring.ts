import { Point } from "../types/Point";
import { type RGB } from "../types/RGB";
import { OrientationParameters } from "../types/OrientationParameters";
import { SkyMarks } from "../types/SkyMarks";
import { getGlobalCoordinates } from "./sky-geometry";
import { colourSpace } from "./star-colouring";
import { Stitch } from "../types/Stitch";
import { pictureOf } from "./brim";

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

/**
 * Colour a hat: the part of it its picture is projected onto, which is
 * everything above the brim (see helpers/brim), as though that were the
 * whole hat. A brim's stitches keep the trim they were knitted in, and no
 * star lands on one. Colours, stars, figures and regions all come back by
 * the hat's own ids.
 */
export const colourHat = (
  stitches: Stitch[],
  positions: Point[],
  orientationParameters: OrientationParameters,
): SkyColouring => {
  const picture = pictureOf(stitches, positions);
  const dyed = colourNodes(picture.positions, orientationParameters);
  if (picture.ids.length === stitches.length) return dyed;
  const own = (at: number) => picture.ids[at] ?? at;
  const colours = stitches.map((stitch) => stitch.colour);
  picture.ids.forEach((id, at) => {
    colours[id] = dyed.colours[at];
  });
  const sky: SkyMarks = {
    ...dyed.sky,
    stars: dyed.sky.stars.map(own),
    constellations: dyed.sky.constellations.map((figure) => ({
      ...figure,
      strokes: figure.strokes.map((stroke) => ({
        ...stroke,
        points: stroke.points.map((point) => ({ ...point, stitch: own(point.stitch) })),
      })),
    })),
    ...(dyed.sky.regions
      ? {
          regions: Object.fromEntries(
            Object.entries(dyed.sky.regions).map(([at, region]) => [own(Number(at)), region]),
          ),
        }
      : {}),
  };
  return { colours, sky };
};
