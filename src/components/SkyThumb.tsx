import React, { useEffect, useMemo, useRef } from "react";
import type { Stitch as HatStitch } from "../types/Stitch";
import type { SkyMarks } from "../types/SkyMarks";
import type { HatReading } from "../knitting/useHatKnitting";
import { sideView } from "../knitting/side-view";
import { slotOf } from "../knitting/yarns";
import { SkyPalette } from "../helpers/sky-palette";
import { yarnFor } from "../reading/palette";

/** The picture's size in pixels, drawn at twice what a card shows. */
const width = 600;
const height = 400;
const margin = 14;

/** A colour from the stylesheet, as a canvas needs it. */
const token = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/**
 * A sky's card picture: the hat as it settled, seen side on and turned to
 * its constellations, its stars on the night and its figures joined up from
 * star to star, as they will be sewn. See knitting/side-view.
 */
const SkyThumb: React.FC<{ hat: HatStitch[]; sky: SkyMarks; reading: HatReading }> = ({ hat, sky, reading }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const { knitting, palette } = reading;
  const view = useMemo(() => sideView(hat, sky), [hat, sky]);
  useEffect(() => {
    const context = ref.current?.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, width, height);
    const scale = Math.min((width - 2 * margin) / view.width, (height - 2 * margin) / view.height);
    const left = width / 2;
    const foot = height - margin;
    const at = (dot: { x: number; y: number }) => [left + dot.x * scale, foot - dot.y * scale] as const;
    const radius = view.spacing * scale * 0.66;
    const stars = new Set(sky.stars);
    const night = yarnFor(palette, slotOf(SkyPalette.Night)).hex;
    const colourOf = (id: number) => yarnFor(palette, knitting.stitches[knitting.idOfHat(id)]?.slot ?? "").hex;

    // A faint rim of starlight round the hat, so a dark dome shows on a dark card.
    context.fillStyle = "rgba(196, 208, 255, 0.16)";
    for (const dot of view.dots) {
      const [x, y] = at(dot);
      context.beginPath();
      context.arc(x, y, radius + 2.5, 0, 2 * Math.PI);
      context.fill();
    }
    // The fabric, far to near, a star's stitch drawn as the night round it, and shaded where it turns from the light.
    for (const dot of view.dots) {
      const [x, y] = at(dot);
      context.beginPath();
      context.arc(x, y, radius, 0, 2 * Math.PI);
      context.fillStyle = stars.has(dot.id) ? night : colourOf(dot.id);
      context.fill();
      context.fillStyle = `rgba(0, 0, 0, ${(0.55 * (1 - dot.lit)).toFixed(3)})`;
      context.fill();
    }
    // The figures, from star to star, where both face you.
    const byId = new Map(view.dots.map((dot) => [dot.id, dot]));
    context.strokeStyle = token("--figure", "#f4f7ff");
    context.globalAlpha = 0.72;
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.beginPath();
    for (const [from, to] of view.lines) {
      const a = byId.get(from);
      const b = byId.get(to);
      if (!a || !b) continue;
      context.moveTo(...at(a));
      context.lineTo(...at(b));
    }
    context.stroke();
    context.globalAlpha = 1;
    // And the stars over all of it, each a point of light about a stitch across.
    for (const dot of view.dots) {
      if (!dot.front || !stars.has(dot.id)) continue;
      const [x, y] = at(dot);
      context.beginPath();
      context.arc(x, y, view.spacing * scale * 0.45, 0, 2 * Math.PI);
      context.fillStyle = colourOf(dot.id);
      context.fill();
    }
  }, [view, sky.stars, palette, knitting]);
  return <canvas ref={ref} className="sky-thumb" width={width} height={height} aria-hidden="true" />;
};

export default SkyThumb;
