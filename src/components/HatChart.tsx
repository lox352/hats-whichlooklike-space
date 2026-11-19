import React, { useCallback, useMemo, useState } from "react";
import type { Stitch as HatStitch } from "../types/Stitch";
import type { SkyMarks } from "../types/SkyMarks";
import type { HatReading } from "../knitting/useHatKnitting";
import { hatPiece } from "../knitting/hat-knitting";
import { hatStitchNotes } from "../knitting/notes";
import { nextStitch, placeOutline, regionAt, skyLines } from "../knitting/places";
import Chart from "../ui/chart/Chart";
import type { ChartOverlay } from "../ui/chart/chart-painter";
import { PlaceNote } from "./Places";

/** A colour from the stylesheet, as the canvas needs it. */
const token = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/**
 * A hat's chart: Sweat Shop's chart of the knitting, every stitch over the
 * stitches it was knitted into, with the constellation figures drawn over it
 * from star to star, and the constellation you are knitting through drawn
 * round, as it always was here - and a stitch tapped says which
 * constellation's sky it is, and draws round that one instead.
 *
 * While sewing, the line in hand is picked out and the chart goes to it.
 * Given an overlay of its own - your time, painted over it - that takes the
 * place of the constellations, and so does what it says of a stitch tapped.
 */
const HatChart: React.FC<{
  hat: HatStitch[];
  sky: SkyMarks;
  reading: HatReading;
  progress: number;
  follow?: boolean;
  followAt?: number;
  onJump?: (progress: number) => void;
  overlay?: ChartOverlay;
  pickerNote?: (id: number) => React.ReactNode;
  /** Sewing: the line in hand, by its key, and those sewn. */
  sewing?: { active?: string; sewn: Set<string> };
  /** A stitch of the hat's own to bring into view: the star the line in hand starts from. */
  showHatStitch?: number;
}> = ({ hat, sky, reading, progress, follow, followAt, onJump, overlay, pickerNote, sewing, showHatStitch }) => {
  const { knitting, stitches, rounds, layout, palette, names, whats } = reading;
  const [picked, setPicked] = useState<number>();
  /*
   * Which constellation to draw round: the one a stitch tapped is in, and
   * while knitting, when nothing is tapped, the one the next stitch is in.
   */
  const next = follow ? nextStitch(knitting, progress) : undefined;
  const place =
    picked !== undefined ? regionAt(sky, knitting, picked) : next !== undefined ? regionAt(sky, knitting, next) : undefined;
  const colours = useMemo(
    () => ({
      figure: token("--figure", "#f4f7ff"),
      active: token("--warm", "#ffd9a0"),
      halo: token("--sky-deep", "#05070f"),
    }),
    [],
  );
  const lines = useMemo(() => {
    const all = skyLines(sky, knitting, colours, sewing);
    // The line in hand last, over the rest.
    return [...all.filter((line) => !line.halo), ...all.filter((line) => line.halo)];
  }, [sky, knitting, colours, sewing]);
  const lit = useMemo<ChartOverlay>(
    () => ({
      lines,
      ...(place ? { outline: placeOutline(sky, knitting, place, { ink: colours.active, halo: colours.halo }) } : {}),
    }),
    [lines, place, sky, knitting, colours.active, colours.halo],
  );
  const placeNote = useCallback(
    (id: number) => <PlaceNote hat={hat} sky={sky} regionKey={regionAt(sky, knitting, id)} />,
    [hat, sky, knitting],
  );
  return (
    <Chart
      stitches={stitches}
      rounds={rounds}
      layout={layout}
      palette={palette}
      progress={progress}
      follow={follow}
      followAt={followAt}
      onJump={onJump}
      showAt={showHatStitch === undefined ? undefined : knitting.idOfHat(showHatStitch)}
      labels={whats}
      names={names}
      stitchNotes={hatStitchNotes}
      pieces={[hatPiece]}
      kinds={knitting.roundKinds}
      roundPieces={knitting.roundPieces}
      overlay={overlay ?? lit}
      onPicked={overlay ? undefined : setPicked}
      // Small enough for the sky to be seen as a sky, as the hat's chart always drew it.
      startZoom={12}
      pickerNote={pickerNote ?? placeNote}
    />
  );
};

export default HatChart;
