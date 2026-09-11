import { RGB } from "../types/RGB";

/**
 * The three yarns a space hat is knitted in.
 *
 * Night is the ground; the Milky Way is one pale band, not a graded ramp; a
 * star is a stitch of white. It used to be five computed blues for the
 * galaxy plus the two ends, up to seven shades for one hat, and the ramp
 * only ever showed its outermost level anyway.
 */
export const SkyPalette = {
  Night: [11, 16, 32] as RGB,
  MilkyWay: [168, 180, 200] as RGB,
  Star: [247, 244, 236] as RGB,
} as const;

export type SkyYarn = keyof typeof SkyPalette;

const same = (a: RGB, b: RGB) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

/** Which of the three yarns a stitch colour is, or undefined if none. */
export const yarnFor = (colour: RGB): SkyYarn | undefined =>
  (Object.keys(SkyPalette) as SkyYarn[]).find((yarn) =>
    same(SkyPalette[yarn], colour)
  );
