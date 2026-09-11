import React, { useEffect, useMemo, useRef, useState } from "react";
import { Stitch } from "./types/Stitch";
import { SkyMarks } from "./types/SkyMarks";
import { layOutStitches, StitchPosition } from "./helpers/pattern-layout";
import { Segment, segmentsOf } from "./helpers/connections";
import { segmentKey } from "./helpers/embroidery";
import { useYarns } from "./useYarns";
import { cssColour, displayYarn, YarnChoices } from "./helpers/yarn-preference";
import { stitchMarkPath } from "./helpers/stitch-marks";
import {
  currentRegion,
  regionCounts,
  regionInfo,
  regionOutline,
} from "./helpers/constellation-guide";
import "./KnittingPattern.css";

interface KnittingPatternProps {
  stitches: Stitch[];
  sky: SkyMarks;
  progress: number;
  /** Mark the next stitch to work and keep it in view. */
  followProgress?: boolean;
  /** The line being sewn, as a segment key, when embroidering. */
  activeSegment?: string;
  /** Lines already sewn, when embroidering. */
  sewnSegments?: string[];
}

const cellSize = 10;
/** Every nth grid line is drawn heavier, to make counting easier. */
const emphasisEvery = 5;

/**
 * How far above the panel the stitch being worked should sit, in rows.
 *
 * Enough that the row you are on and the few you have just finished are all
 * clear of the panel, rather than the stitch you want hugging its top edge.
 */
const rowsAbovePanel = 5;

const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const Label: React.FC<{
  row: number;
  col: number;
  edge: "right" | "bottom";
  children: React.ReactNode;
}> = ({ row, col, edge, children }) => (
  <div
    className={`chart-label chart-label-${edge}`}
    style={{ gridRow: row, gridColumn: col }}
  >
    {children}
  </div>
);

const StitchBox: React.FC<{
  stitch: Stitch;
  position: StitchPosition;
  numRows: number;
  numCols: number;
  completed: boolean;
  isNext: boolean;
  /** No neighbour on that side, so this cell closes the outline itself. */
  openTop: boolean;
  openLeft: boolean;
  yarns: YarnChoices;
  /** The constellation this stitch's sky is in, if the hat knows. */
  region?: string;
}> = React.memo(
  ({
    stitch,
    position,
    numRows,
    numCols,
    completed,
    isNext,
    openTop,
    openLeft,
    yarns,
    region,
  }) => {
    const mark = stitchMarkPath(stitch.type, 0, 0, cellSize);
    return (
      <div
        className={[
          "chart-cell",
          /*
           * The heavy lines fall *after* every fifth stitch and row, counting
           * from the bottom right as you knit.
           *
           * A cell draws its own right and bottom, and stitch number n sits at
           * col 1 - n (so stitch 1 is col 0, and the numbers grow leftwards).
           * The line between stitch 5 and stitch 6 is therefore the right-hand
           * border of stitch 6, which is col -5. Marking col -5, -10, -15 puts
           * the line after each fifth stitch; marking stitch 5 itself, as this
           * used to, put it between 4 and 5.
           */
          position.col !== 0 && position.col % emphasisEvery === 0
            ? "chart-cell-major-col"
            : "",
          position.row !== 0 && position.row % emphasisEvery === 0
            ? "chart-cell-major-row"
            : "",
          // Nothing above or to the left to draw the line, so draw it here.
          openTop ? "chart-cell-open-top" : "",
          openLeft ? "chart-cell-open-left" : "",
          completed ? "chart-cell-done" : "",
          isNext ? "chart-cell-next" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        data-next-stitch={isNext ? "true" : undefined}
        data-stitch={stitch.id}
        data-region={region}
        style={{
          gridRow: numRows + position.row,
          gridColumn: numCols + position.col,
          backgroundColor: cssColour(displayYarn(stitch.colour, yarns).colour),
        }}
      >
        {mark && (
          <svg
            className="chart-mark"
            viewBox={`0 0 ${cellSize} ${cellSize}`}
            aria-hidden="true"
          >
            <path className="chart-mark-halo" d={mark} vectorEffect="non-scaling-stroke" />
            <path d={mark} vectorEffect="non-scaling-stroke" />
          </svg>
        )}
      </div>
    );
  }
);

/**
 * The constellation figures over the chart: one SVG spanning every cell.
 *
 * A single drawing rather than one per line, laid into the grid so it is
 * exactly the cells' size and scrolls with them, and with overflow visible so
 * a line running off the brim can be drawn leaving the hat, below the last
 * row, instead of being clipped at it.
 *
 * The chart is a tube cut open, so a line between two stitches on opposite
 * sides of the seam is drawn twice, once each way round; and a stroke that
 * runs off the brim is drawn to where its missing star would be, as far
 * below the brim as its reflection landed above it, and dashed.
 */
const SkyLines: React.FC<{
  segments: Segment[];
  positions: Record<number, StitchPosition>;
  numRows: number;
  numCols: number;
  activeSegment?: string;
  sewn: Set<string>;
  embroidering: boolean;
}> = React.memo(
  ({ segments, positions, numRows, numCols, activeSegment, sewn, embroidering }) => {
    const width = numCols * cellSize;
    const height = numRows * cellSize;
    const centreX = (position: StitchPosition) =>
      (numCols + position.col - 0.5) * cellSize;
    const centreY = (position: StitchPosition, offHat: boolean) =>
      (offHat ? numRows - position.row + 0.5 : numRows + position.row - 0.5) *
      cellSize;

    return (
      <svg
        className={`chart-sky${embroidering ? " chart-sky-embroidering" : ""}`}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ gridArea: `1 / 1 / ${numRows + 1} / ${numCols + 1}` }}
        aria-hidden="true"
      >
        {segments.map((segment) => {
          const a = positions[segment.from.stitch];
          const b = positions[segment.to.stitch];
          if (!a || !b) return null;
          let x1 = centreX(a);
          let x2 = centreX(b);
          const y1 = centreY(a, segment.from.offHat);
          const y2 = centreY(b, segment.to.offHat);
          const crossesSeam = Math.abs(x2 - x1) > width / 2;
          if (crossesSeam) {
            if (x1 < x2) x1 += width;
            else x2 += width;
          }
          const key = segmentKey(segment);
          const state =
            key === activeSegment
              ? "chart-line-active"
              : sewn.has(key)
                ? "chart-line-sewn"
                : "chart-line-pending";
          const offHat = segment.from.offHat || segment.to.offHat;
          const copies = crossesSeam ? [0, -width] : [0];
          return (
            <g
              key={key}
              className={`chart-line ${state}${offHat ? " chart-line-off-hat" : ""}`}
              data-segment={key}
            >
              {copies.map((shift) => (
                <React.Fragment key={shift}>
                  {key === activeSegment && (
                    <line
                      className="chart-line-halo"
                      x1={x1 + shift}
                      y1={y1}
                      x2={x2 + shift}
                      y2={y2}
                    />
                  )}
                  <line x1={x1 + shift} y1={y1} x2={x2 + shift} y2={y2} />
                </React.Fragment>
              ))}
            </g>
          );
        })}
      </svg>
    );
  }
);

const KnittingPattern: React.FC<KnittingPatternProps> = ({
  stitches,
  sky,
  progress,
  followProgress = false,
  activeSegment,
  sewnSegments,
}) => {
  const { yarns } = useYarns();
  const gridRef = useRef<HTMLDivElement>(null);
  const nextStitchId = followProgress ? progress + 1 : undefined;

  /*
   * Which constellation to show. The sky is tiled, so every stitch is in
   * one, and the chart can say which: hovering names the region under the
   * pointer, a tap pins it (a second tap on it lets go), and while knitting
   * the region of the next stitch is shown when nothing else is asked for.
   */
  const [hoveredRegion, setHoveredRegion] = useState<string>();
  const [pinnedRegion, setPinnedRegion] = useState<string>();
  const regionOf = (target: EventTarget) =>
    (target as Element).closest<HTMLElement>("[data-region]")?.dataset.region;

  const filteredStitches = useMemo(
    () => stitches.filter((stitch) => stitch.id !== 0),
    [stitches]
  );

  const { positions, numRows, numCols } = useMemo(
    () => layOutStitches(filteredStitches),
    [filteredStitches]
  );

  const segments = useMemo(() => segmentsOf(sky), [sky]);
  const sewn = useMemo(() => new Set(sewnSegments ?? []), [sewnSegments]);
  const embroidering = activeSegment !== undefined || sewnSegments !== undefined;

  const counts = useMemo(() => regionCounts(stitches, sky), [stitches, sky]);
  const knittingRegion = followProgress
    ? currentRegion(sky, progress, filteredStitches.length)
    : undefined;
  const shownRegion = hoveredRegion ?? pinnedRegion ?? knittingRegion;
  const shown = shownRegion ? regionInfo(shownRegion) : undefined;
  const shownCount = counts.find((c) => c.abbreviation === shownRegion);
  const outline = useMemo(
    () =>
      sky.regions && shownRegion
        ? regionOutline(sky.regions, positions, numRows, numCols, cellSize, shownRegion)
        : "",
    [sky.regions, shownRegion, positions, numRows, numCols]
  );

  /*
   * Which squares of the grid have a stitch in them, so a cell can tell
   * whether anything is going to draw the line above or to the left of it.
   * Rows count upwards as they go negative and columns leftwards, so the
   * neighbour above is one row lower and the one to the left one column lower.
   */
  const filled = useMemo(() => {
    const squares = new Set<string>();
    for (const stitch of filteredStitches) {
      const position = positions[stitch.id];
      if (position) squares.add(`${position.row},${position.col}`);
    }
    return squares;
  }, [filteredStitches, positions]);

  /*
   * The stitch to keep in view: the next one to knit, or, when sewing, the
   * star the current line starts from.
   */
  const focusStitchId = useMemo(() => {
    if (nextStitchId !== undefined) return nextStitchId;
    if (!activeSegment) return undefined;
    const segment = segments.find((s) => segmentKey(s) === activeSegment);
    return segment?.from.stitch;
  }, [nextStitchId, activeSegment, segments]);

  // Sideways, within the chart: keep the stitch being worked in the middle, so
  // the chart follows the knitter rather than having to be hunted for.
  useEffect(() => {
    if (focusStitchId === undefined) return;
    const grid = gridRef.current;
    const cell = grid?.querySelector<HTMLElement>(`[data-stitch="${focusStitchId}"]`);
    if (!grid || !cell) return;
    const target =
      cell.offsetLeft - grid.clientWidth / 2 + cell.offsetWidth / 2;
    grid.scrollTo({
      left: Math.max(target, 0),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [focusStitchId]);

  /*
   * And down the page: keep that stitch clear of the panel.
   *
   * Only when the row changes. Within a row the stitch moves sideways, which
   * the effect above handles, and scrolling the page on every stitch would
   * have the whole chart twitching once per stitch.
   */
  const focusRow =
    focusStitchId === undefined ? undefined : positions[focusStitchId]?.row;

  useEffect(() => {
    if (focusRow === undefined || focusStitchId === undefined) return;
    const cell = gridRef.current?.querySelector<HTMLElement>(
      `[data-stitch="${focusStitchId}"]`
    );
    if (!cell) return;
    /*
     * The panel is stuck to the bottom of the screen while you work, so the
     * part of the page you can actually see ends at its top edge rather than
     * at the bottom of the window.
     *
     * Its height, not wherever it happens to be sitting: it is sticky, so at
     * the very bottom of the page it comes unstuck and rides higher than it
     * will once the page has scrolled. Aiming at that moving line settled
     * the stitch six rows off.
     */
    const panel = document.querySelector<HTMLElement>(".knitting-panel");
    const floor = window.innerHeight - (panel?.offsetHeight ?? 0);
    const wanted = floor - rowsAbovePanel * cellSize;
    const delta = cell.getBoundingClientRect().bottom - wanted;
    if (Math.abs(delta) < 1) return;
    window.scrollBy({
      top: delta,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    // Re-aim only when the row changes; the id is in the closure for the query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRow]);

  if (numRows === 0 || numCols === 0) {
    return <p>This pattern has no stitches to chart.</p>;
  }

  return (
    <div>
      <div
        id="printable-section"
        className={`chart${sky.regions ? " chart-labelled" : ""}`}
        ref={gridRef}
        onPointerOver={(event) => {
          // A finger has no hover; on touch the tap below does the work.
          if (event.pointerType === "touch") return;
          setHoveredRegion(regionOf(event.target));
        }}
        onPointerLeave={() => setHoveredRegion(undefined)}
        onClick={(event) => {
          const region = regionOf(event.target);
          if (!region) return;
          setPinnedRegion((pinned) => (pinned === region ? undefined : region));
        }}
        style={{
          gridTemplateRows: `repeat(${numRows + 1}, ${cellSize}px)`,
          gridTemplateColumns: `repeat(${numCols + 1}, ${cellSize}px)`,
          minHeight: `${(numRows + 2) * cellSize}px`,
        }}
      >
        {filteredStitches.map((stitch) => {
          const position = positions[stitch.id];
          if (!position) return null;
          return (
            <StitchBox
              key={`box-${stitch.id}`}
              stitch={stitch}
              position={position}
              numRows={numRows}
              numCols={numCols}
              completed={stitch.id <= progress}
              isNext={stitch.id === nextStitchId}
              openTop={!filled.has(`${position.row - 1},${position.col}`)}
              openLeft={!filled.has(`${position.row},${position.col - 1}`)}
              yarns={yarns}
              region={sky.regions?.[stitch.id]}
            />
          );
        })}
        {[...Array(numCols)].map((_, colIndex) => {
          if ((colIndex + 1) % emphasisEvery !== 0) return null;
          return (
            <Label
              key={`col-label-${colIndex}`}
              edge="bottom"
              row={numRows + 1}
              col={numCols - colIndex}
            >
              {colIndex + 1}
            </Label>
          );
        })}
        {[...Array(numRows)].map((_, rowIndex) => {
          if ((rowIndex + 1) % emphasisEvery !== 0) return null;
          return (
            <Label
              key={`row-label-${rowIndex}`}
              edge="right"
              col={numCols + 1}
              row={numRows - rowIndex}
            >
              {rowIndex + 1}
            </Label>
          );
        })}
        {outline && (
          <svg
            className="chart-region"
            width={numCols * cellSize}
            height={numRows * cellSize}
            style={{ gridArea: `1 / 1 / ${numRows + 1} / ${numCols + 1}` }}
            aria-hidden="true"
          >
            <path d={outline} />
          </svg>
        )}
        <SkyLines
          segments={segments}
          positions={positions}
          numRows={numRows}
          numCols={numCols}
          activeSegment={activeSegment}
          sewn={sewn}
          embroidering={embroidering}
        />
      </div>
      {sky.regions && (
        <p className="chart-region-caption screen-only" aria-live="polite">
          {shown ? (
            <>
              <span className="chart-region-name">{shown.name}</span>
              <span className="chart-region-meaning">, {shown.meaning}</span>
              {shownCount && (
                <span className="chart-region-count">
                  {" "}
                  · {shownCount.stitches} stitches, {shownCount.stars}{" "}
                  {shownCount.stars === 1 ? "star" : "stars"}
                </span>
              )}
              {shownRegion === pinnedRegion && hoveredRegion === undefined && (
                <span className="chart-region-count"> · tap again to let go</span>
              )}
              {" "}
              <a href={shown.url} target="_blank" rel="noreferrer">
                IAU guide
              </a>
            </>
          ) : (
            "Every stitch is in a constellation. Point at the chart, or tap it, to see which."
          )}
        </p>
      )}
      <p className="chart-caption">
        {numCols} stitches across, {numRows} rows. Read from the bottom right,
        working right to left; scroll sideways to see the whole round. The white
        lines are the constellations, sewn on after the knitting; a dashed line
        runs off the brim to a star that is not on the hat.
      </p>
    </div>
  );
};

export default KnittingPattern;
