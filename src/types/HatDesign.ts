import { DecreaseMethod } from "./KnittingMachine";
import { GlobalCoordinates } from "./GlobalCoordinates";
import { OrientationParameters } from "./OrientationParameters";
import {
  defaultDecreaseMethod,
  defaultNumberOfRows,
  defaultStitchesPerRow,
} from "../helpers/sizing";
import { defaultOrientationParameters } from "./OrientationParameters";

/**
 * Everything needed to reproduce a hat.
 *
 * The stitches themselves are a pure function of this (KnittingMachine is
 * seeded from the stitch count), so this is the only thing that has to travel
 * in a URL or be remembered across a refresh.
 */
/** A civil clock time, as read off a clock at the place. */
export interface SkyMoment {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/**
 * Where the sky point came from, when it came from a night and a place.
 *
 * The orientation below is what the hat is charted from, and is enough to
 * reproduce it. But it is derived: a shared link that carried only the
 * right ascension and declination would open as a bare point in the sky,
 * and the night it stood for would be gone. So the source travels with it.
 */
export interface SkySource {
  moment: SkyMoment;
  place: GlobalCoordinates;
  /** The IANA zone the clock was read in, when the place has more than one. */
  zone?: string;
  /** Which of two clock readings, on a night the clocks went back. */
  occurrence?: number;
}

export interface HatDesign {
  stitchesPerRow: number;
  numberOfRows: number;
  decreaseMethod: DecreaseMethod;
  orientation: OrientationParameters;
  source?: SkySource;
}

export const defaultHatDesign: HatDesign = {
  stitchesPerRow: defaultStitchesPerRow,
  numberOfRows: defaultNumberOfRows,
  decreaseMethod: defaultDecreaseMethod,
  orientation: defaultOrientationParameters,
};
