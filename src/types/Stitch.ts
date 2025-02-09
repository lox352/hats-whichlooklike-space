import { RGB } from "../PixelCanvas/PixelGrid";
import { Point } from "./Point";
import { StitchType } from "./StitchType";

export interface Stitch {
  id: number;
  position: Point;
  links: number[];
  connections: number[];
  fixed: boolean;
  type: StitchType
  colour: RGB;
}