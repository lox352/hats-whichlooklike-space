import { RGB } from "../types/RGB";
import { SkyPalette } from "./sky-palette";

/**
 * Which real yarn stands in for each of the sky's three colours.
 *
 * The pattern palette in sky-palette.ts is an identity, not a look: it is
 * what is written into every saved pattern, and the star count and the
 * export read a stitch's yarn back from it. So it never changes, and what
 * a stitch looks like is decided here instead, on the way out to the chart,
 * the hat, the printed key and the knitting panel. The defaults are the
 * yarns as the site shows them; the ones you actually buy are yours to
 * set in their place.
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

/*
 * How the three yarns look by default. Night is an inky black, only just
 * off true black so the chart's rules still read on it; the Milky Way is a
 * rich purple, which a real sky never is and a knitted one should be; a
 * star is warm white. These must stay in step with the tokens of the same
 * names in index.css.
 */
export const shownColours = {
  Night: [12, 10, 18] as RGB,
  MilkyWay: [88, 52, 138] as RGB,
  Star: [247, 244, 236] as RGB,
} as const;

export const skyColours: { key: string; label: string; colour: RGB }[] = [
  { key: yarnKey(SkyPalette.Night), label: "Night", colour: shownColours.Night },
  {
    key: yarnKey(SkyPalette.MilkyWay),
    label: "Milky Way",
    colour: shownColours.MilkyWay,
  },
  { key: yarnKey(SkyPalette.Star), label: "Star", colour: shownColours.Star },
];

export type YarnChoices = Record<string, Yarn>;

export const defaultYarns = (): YarnChoices =>
  Object.fromEntries(
    skyColours.map(({ key, label, colour }) => [key, { name: label, colour }]),
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
      ]),
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
