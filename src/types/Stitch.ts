import { StarInformation } from "../helpers/star-colouring";
import { RGB } from "../PixelCanvas/PixelGrid";
import { Point } from "./Point";
import { StitchType } from "./StitchType";

interface Stitch {
  id: number;
  position: Point;
  links: number[];
  starInfo: StarInformation;
  fixed: boolean;
  type: StitchType;
  colour: RGB;
}

const destringify = (stitch: string): Stitch => {
  const parsed = JSON.parse(stitch);
  const connectedStars = Object.entries(parsed.starInfo.connectedStars).reduce(
    (acc, [key, value]) => {
      acc.set(key, value as number[]);
      return acc;
    },
    new Map<string, number[]>()
  );

  return {
    ...parsed,
    starInfo: {
      ...parsed.starInfo,
      connectedStars,
    },
  };
};


const stringify = (stitch: Stitch): string => {
  const connectedStars = Array.from(
    stitch.starInfo.connectedStars.entries()
  ).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as { [key: string]: number[] });

  return JSON.stringify({
    ...stitch,
    starInfo: {
      ...stitch.starInfo,
      connectedStars: connectedStars,
    },
  });
};

export { type Stitch, stringify, destringify };
