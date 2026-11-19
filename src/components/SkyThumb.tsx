import React, { useEffect, useMemo, useRef } from "react";
import type { Stitch as HatStitch } from "../types/Stitch";
import type { SkyMarks } from "../types/SkyMarks";
import type { HatReading } from "../knitting/useHatKnitting";
import { unrolled } from "../knitting/unrolled";
import { yarnFor } from "../reading/palette";
import type { RGB } from "../types/RGB";

/** The picture's size in pixels, drawn at twice what a card shows: the print's shape, inside its mount. */
const width = 640;
const height = 330;

/** How tall a brim's strip is, in the picture's pixels. */
const brimBand = 16;

/** A brim along the foot of the picture: its colour, ribbed two and two. */
const drawBrim = (context: CanvasRenderingContext2D, colour: RGB) => {
  context.fillStyle = `rgb(${colour.join(",")})`;
  context.fillRect(0, height - brimBand, width, brimBand);
  context.fillStyle = "rgba(0, 0, 0, 0.16)";
  for (let x = 4; x < width; x += 8) context.fillRect(x, height - brimBand, 4, brimBand);
};

/** A colour from the stylesheet, as a canvas needs it. */
const token = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/**
 * A sky's card picture: the sky the hat is a picture of, unrolled into a
 * rectangle edge to edge - every round across the full width, the crown at
 * the top - in the knitter's own yarns, with its constellations joined up
 * from star to star over it, as they will be sewn. See knitting/unrolled. A
 * brim is a ribbed strip along the foot, in its own colour.
 */
const SkyThumb: React.FC<{ hat: HatStitch[]; sky: SkyMarks; reading: HatReading }> = ({ hat, sky, reading }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const { knitting, palette } = reading;
  const rounds = useMemo(() => unrolled(hat, knitting), [hat, knitting]);
  const trim = useMemo(() => hat.find((stitch) => stitch.brim)?.colour, [hat]);
  useEffect(() => {
    const context = ref.current?.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, width, height);
    const brim = trim ? brimBand : 0;
    if (trim) drawBrim(context, trim);
    const tall = (height - brim) / Math.max(rounds.length, 1);
    // Where each stitch's middle is in the picture, for the figures to join.
    const middles = new Map<number, [number, number]>();
    rounds.forEach((row, at) => {
      const top = height - brim - (at + 1) * tall;
      for (const one of row) {
        context.fillStyle = yarnFor(palette, one.slot).hex;
        const x = one.from * width;
        const span = (one.to - one.from) * width + 0.75;
        for (const shift of [-width, 0, width]) {
          if (x + shift < width && x + shift + span > 0) context.fillRect(x + shift, top, span, tall + 0.75);
        }
        middles.set(one.id, [((((one.from + one.to) / 2) % 1) + 1) % 1 * width, top + tall / 2]);
      }
    });
    // The figures, from star to star; a line across the seam is drawn both ways round, off each edge.
    context.strokeStyle = token("--figure", "#f4f7ff");
    context.globalAlpha = 0.8;
    context.lineWidth = 1.6;
    context.lineCap = "round";
    context.beginPath();
    for (const figure of sky.constellations)
      for (const stroke of figure.strokes)
        stroke.points.slice(1).forEach((to, at) => {
          const from = stroke.points[at];
          if (from.offHat || to.offHat) return;
          const a = middles.get(knitting.idOfHat(from.stitch));
          const b = middles.get(knitting.idOfHat(to.stitch));
          if (!a || !b) return;
          const across = Math.abs(a[0] - b[0]) > width / 2;
          const [near, far] = a[0] < b[0] ? [a, b] : [b, a];
          const shifts = across ? [[0, -width], [width, 0]] : [[0, 0]];
          for (const [nearShift, farShift] of shifts) {
            context.moveTo(near[0] + nearShift, near[1]);
            context.lineTo(far[0] + farShift, far[1]);
          }
        });
    context.stroke();
    context.globalAlpha = 1;
  }, [rounds, palette, sky, knitting, trim]);
  return <canvas ref={ref} className="sky-thumb" width={width} height={height} aria-hidden="true" />;
};

export default SkyThumb;
