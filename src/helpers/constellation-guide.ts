import info from "../data/constellation-info.json";
import { constellationName } from "../data/constellation-names";
import { SkyMarks } from "../types/SkyMarks";
import { Stitch } from "../types/Stitch";
import { StitchPosition } from "./pattern-layout";

/*
 * What to say about a constellation once a stitch has told you which one
 * it is in: its name, what the name means, and how much of this hat is
 * in it. The chart caption, the knitting panel and the index all read
 * from here.
 */

type Info = Record<string, { meaning: string; url: string }>;

export interface Region {
  abbreviation: string;
  name: string;
  /** "the Hunter", "the Southern Cross". */
  meaning: string;
  /** The IAU's page on it. */
  url: string;
}

/** Everything known about a region, or undefined for an unknown label. */
export const regionInfo = (abbreviation: string): Region | undefined => {
  const entry = (info as Info)[abbreviation];
  return entry
    ? { abbreviation, name: constellationName(abbreviation), ...entry }
    : undefined;
};

export interface RegionCount {
  abbreviation: string;
  /** Knitted stitches in the region on this hat. */
  stitches: number;
  /** Of which, stars. */
  stars: number;
}

/** How much of the hat each constellation gets, in name order. */
export const regionCounts = (
  stitches: Stitch[],
  sky: SkyMarks,
): RegionCount[] => {
  if (!sky.regions) return [];
  const stars = new Set(sky.stars);
  const counts = new Map<string, RegionCount>();
  for (const stitch of stitches) {
    if (stitch.id <= 0) continue;
    const abbreviation = sky.regions[stitch.id];
    if (!abbreviation) continue;
    let count = counts.get(abbreviation);
    if (!count) {
      count = { abbreviation, stitches: 0, stars: 0 };
      counts.set(abbreviation, count);
    }
    count.stitches += 1;
    if (stars.has(stitch.id)) count.stars += 1;
  }
  return [...counts.values()].sort((a, b) =>
    constellationName(a.abbreviation).localeCompare(
      constellationName(b.abbreviation),
    ),
  );
};

/**
 * The constellation the next stitch is in: the one whose sky you are
 * knitting through. Undefined once the hat is finished, or when the hat
 * carries no labels.
 */
export const currentRegion = (
  sky: SkyMarks,
  progress: number,
  total: number,
): string | undefined =>
  progress < total ? sky.regions?.[progress + 1] : undefined;

/**
 * The outline of one region on the chart, as an SVG path in chart pixels:
 * every cell edge where the region meets a different one, or the edge of
 * the fabric. Interior edges are left out, so the region reads as one
 * shape rather than a grid of cells. The chart seam cuts it, as it cuts
 * everything: the two edges meet once the hat is knitted round.
 */
export const regionOutline = (
  regions: Record<number, string>,
  positions: Record<number, StitchPosition>,
  numRows: number,
  numCols: number,
  cellSize: number,
  abbreviation: string,
): string => {
  const at = new Map<string, string | undefined>();
  for (const [id, position] of Object.entries(positions)) {
    at.set(`${position.row},${position.col}`, regions[Number(id)]);
  }
  const edges: string[] = [];
  for (const [id, { row, col }] of Object.entries(positions)) {
    if (regions[Number(id)] !== abbreviation) continue;
    const x = (numCols + col - 1) * cellSize;
    const y = (numRows + row - 1) * cellSize;
    const other = (r: number, c: number) => at.get(`${r},${c}`) !== abbreviation;
    if (other(row - 1, col)) edges.push(`M${x},${y}h${cellSize}`);
    if (other(row + 1, col)) edges.push(`M${x},${y + cellSize}h${cellSize}`);
    if (other(row, col - 1)) edges.push(`M${x},${y}v${cellSize}`);
    if (other(row, col + 1)) edges.push(`M${x + cellSize},${y}v${cellSize}`);
  }
  return edges.join("");
};
