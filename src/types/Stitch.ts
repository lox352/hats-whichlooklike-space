import { StarInformation } from "../helpers/star-colouring";
import { RGB } from "../PixelCanvas/PixelGrid";
import { Point } from "./Point";
import { StitchType } from "./StitchType";

export interface Stitch {
  id: number;
  position: Point;
  links: number[];
  starInfo: StarInformation;
  fixed: boolean;
  type: StitchType
  colour: RGB;
}