import { RGB } from "./RGB";
import { Point } from "./Point";
import { StitchType } from "./StitchType";

export interface Stitch {
  id: number;
  position: Point;
  links: number[];
  fixed: boolean;
  type: StitchType;
  colour: RGB;
  /**
   * Part of the brim: knitted in the trim and on the smaller needles, and no
   * part of the picture, which is projected onto the rest of the hat.
   */
  brim?: true;
  /**
   * The needles it is knitted on, in millimetres, where they change: on the
   * first stitch cast on, and on the first stitch after the brim. Absent on
   * hats knitted before there was a brim.
   */
  needles?: number;
}
