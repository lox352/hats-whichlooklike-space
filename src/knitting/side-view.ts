import type { Stitch as HatStitch } from "../types/Stitch";
import type { SkyMarks } from "../types/SkyMarks";

/**
 * The hat as it settled, seen from the side: what a card shows of a sky.
 *
 * Every saved hat keeps the shape it settled into (each stitch's position),
 * so this is that shape looked at from in front and lit from the upper left,
 * turned so that as much of its constellations as can face you does: the
 * side of the hat with the most of its figures' stars on it, nearest the
 * middle. The back of the hat is hidden behind the front, and a figure is
 * drawn only where both its stars face you.
 *
 * Everything is in the hat's own units, the brim at y = 0 and up the screen;
 * a picture scales it to fit.
 */

export interface SideDot {
  /** The hat's own stitch id. */
  id: number;
  x: number;
  y: number;
  /** Nearer you is larger: dots are drawn far to near. */
  depth: number;
  /** How much of the light it catches, 0 to 1. */
  lit: number;
  /** Whether it faces you, rather than the back of the hat seen through the gap at the brim. */
  front: boolean;
}

export interface SideView {
  /** Far to near. */
  dots: SideDot[];
  /** A figure's lines, by the hat's stitch ids, where both ends face you. */
  lines: [number, number][];
  /** How far apart neighbouring stitches are, for how large to draw a dot. */
  spacing: number;
  width: number;
  height: number;
  /** The turn chosen, in radians round the hat. */
  turn: number;
}

/** From the upper left, and a little in front. */
const light = (() => {
  const raw = [-0.45, 0.55, 0.7];
  const length = Math.hypot(...raw);
  return raw.map((one) => one / length);
})();

/**
 * The turn that puts the most of the figures' stars in front, nearest the
 * middle: each star counts by how squarely it faces you.
 */
export const bestTurn = (hat: HatStitch[], sky: SkyMarks, tries = 48): number => {
  const ids = new Set<number>();
  for (const figure of sky.constellations)
    for (const stroke of figure.strokes) for (const point of stroke.points) if (!point.offHat) ids.add(point.stitch);
  const points = [...ids].map((id) => hat[id]?.position).filter((one) => one !== undefined);
  if (points.length === 0) return 0;
  let best = 0;
  let bestScore = -Infinity;
  for (let k = 0; k < tries; k++) {
    const turn = (2 * Math.PI * k) / tries;
    const [c, s] = [Math.cos(turn), Math.sin(turn)];
    let score = 0;
    for (const p of points) {
      const z = p.x * s + p.z * c;
      const r = Math.hypot(p.x, p.z) || 1;
      if (z > 0) score += z / r;
    }
    if (score > bestScore) [best, bestScore] = [turn, score];
  }
  return best;
};

export const sideView = (hat: HatStitch[], sky: SkyMarks, turn = bestTurn(hat, sky)): SideView => {
  const knitted = hat.filter((stitch) => stitch.id > 0);
  const [c, s] = [Math.cos(turn), Math.sin(turn)];
  const maxR = Math.max(...knitted.map((one) => Math.hypot(one.position.x, one.position.z)), 1e-6);
  const minY = Math.min(...knitted.map((one) => one.position.y));
  const maxY = Math.max(...knitted.map((one) => one.position.y));
  // The crown is a dome round a centre this far below its top; below that the hat is a tube.
  const domeCentre = maxY - maxR;
  const castOn = hat.filter((one) => one.fixed && one.type !== "join").length || 1;

  const dots: SideDot[] = knitted.map((stitch) => {
    const { x: x0, y, z: z0 } = stitch.position;
    const x = x0 * c - z0 * s;
    const z = x0 * s + z0 * c;
    const up = y > domeCentre ? y - domeCentre : 0;
    const length = Math.hypot(x, up, z) || 1;
    const lit = Math.max(0, (x * light[0] + up * light[1] + z * light[2]) / length);
    return { id: stitch.id, x, y: y - minY, depth: z, lit, front: z > -0.05 * maxR };
  });
  dots.sort((a, b) => a.depth - b.depth);

  const facing = new Set(dots.filter((dot) => dot.front).map((dot) => dot.id));
  const lines: [number, number][] = [];
  for (const figure of sky.constellations)
    for (const stroke of figure.strokes)
      stroke.points.slice(1).forEach((to, at) => {
        const from = stroke.points[at];
        if (!from.offHat && !to.offHat && facing.has(from.stitch) && facing.has(to.stitch)) lines.push([from.stitch, to.stitch]);
      });

  return { dots, lines, spacing: (2 * Math.PI * maxR) / castOn, width: 2 * maxR, height: maxY - minY, turn };
};
