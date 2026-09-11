import { RGB } from "../types/RGB";
import { SkyPalette } from "./sky-palette";

/**
 * Which real yarn stands in for each of the earth's colours.
 *
 * The matching palette is deliberately not editable. Colours are chosen by
 * nearest neighbour against the globe raster, so changing the values would
 * change which stitches come out as land or sea and distort the map. The
 * earth's colours are fixed; what is yours is the yarn you knit them in.
 *
 * So this is a display mapping applied on the way out, to the chart, the
 * printed key and the knitting panel. The pattern data is untouched.
 */

export interface Yarn {
  /** What to call it, on the chart key and while knitting. */
  name: string;
  /** What to draw it as. */
  colour: RGB;
}

/** Key for a palette entry: its fixed colour, as written in the pattern. */
export const yarnKey = (colour: RGB): string =>
  `${colour[0]},${colour[1]},${colour[2]}`;

export const skyColours: { key: string; label: string; colour: RGB }[] = [
  { key: yarnKey(SkyPalette.Night), label: "Night", colour: SkyPalette.Night },
  { key: yarnKey(SkyPalette.MilkyWay), label: "Milky Way", colour: SkyPalette.MilkyWay },
  { key: yarnKey(SkyPalette.Star), label: "Star", colour: SkyPalette.Star },
];

export type YarnChoices = Record<string, Yarn>;

export const defaultYarns = (): YarnChoices =>
  Object.fromEntries(
    skyColours.map(({ key, label, colour }) => [
      key,
      { name: label, colour },
    ])
  );

const storageKey = "space-yarn-choices";

const channel = (value: unknown): number => {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return 0;
  return Math.min(Math.max(number, 0), 255);
};

const sanitiseYarn = (raw: unknown, fallback: Yarn): Yarn => {
  if (typeof raw !== "object" || raw === null) return fallback;
  const candidate = raw as Partial<Yarn>;
  const name =
    typeof candidate.name === "string" && candidate.name.trim().length > 0
      ? candidate.name.trim().slice(0, 40)
      : fallback.name;
  const colour = Array.isArray(candidate.colour)
    ? ([
        channel(candidate.colour[0]),
        channel(candidate.colour[1]),
        channel(candidate.colour[2]),
      ] as RGB)
    : fallback.colour;
  return { name, colour };
};

export const readYarns = (): YarnChoices => {
  const defaults = defaultYarns();
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return defaults;
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    return Object.fromEntries(
      skyColours.map(({ key }) => [
        key,
        sanitiseYarn(parsed[key], defaults[key]),
      ])
    );
  } catch {
    return defaults;
  }
};

export const writeYarns = (yarns: YarnChoices): void => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(yarns));
  } catch {
    // A preference that cannot be saved is not worth interrupting anyone over.
  }
};

export const clearYarns = (): void => {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Nothing to do.
  }
};

/** How a stitch of this pattern colour should be shown. */
export const displayYarn = (colour: RGB, yarns: YarnChoices): Yarn => {
  const key = yarnKey(colour);
  return (
    yarns[key] ?? {
      name: `rgb(${key})`,
      colour,
    }
  );
};

export const cssColour = (colour: RGB): string =>
  `rgb(${channel(colour[0])},${channel(colour[1])},${channel(colour[2])})`;
