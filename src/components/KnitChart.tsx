import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { SavedPattern } from "../types/SavedPattern";
import type { EmbroideryProgress } from "../types/SkyMarks";
import { embroideryParam, knittingParam } from "../helpers/pattern-storage";
import { completedSegments, selectedSegment, sewingGroups } from "../helpers/embroidery";
import { regionInfo } from "../helpers/constellation-guide";
import { useSavedPattern } from "../knitting/useSavedPattern";
import { useHatKnitting } from "../knitting/useHatKnitting";
import { hatFinishing, hatStitchNotes } from "../knitting/notes";
import { nextStitch, regionAt } from "../knitting/places";
import { patternPath, percentKnitted, statsParam } from "../knitting/paths";
import { currentRun, positionOf, totals, whereYouAre } from "../reading/progress";
import { keyEntryAt } from "../reading/stitch-key";
import KnittingPanel from "../ui/components/KnittingPanel";
import { KeySheet } from "../ui/components/KnitKey";
import { SpeedsSheet, StatsPanel, StitchTime } from "../ui/components/StatsView";
import { statsOverlay, type Layer } from "../ui/chart/timing-overlay";
import { useKnittingTime, useTimeDetail, useTimeRecording } from "../ui/useKnittingTime";
import HatChart from "./HatChart";
import EmbroideryPanel from "./EmbroideryPanel";
import { PlaceNow } from "./Places";
import PageLayout from "./ui/PageLayout";
import Button from "./ui/Button";
import "./KnitScreen.css";

/**
 * Under the chart while you look around it and are neither knitting nor
 * sewing: where the knitting is, the key and the time spent, and the way back
 * to the needles - or, once the sky is knitted, to the embroidery needle.
 */
const LookBar: React.FC<{
  percent: number;
  worked: number;
  where: string;
  finished: boolean;
  canSew: boolean;
  onKnit: () => void;
  onSew: () => void;
  onKey: () => void;
  onStats?: () => void;
}> = ({ percent, worked, where, finished, canSew, onKnit, onSew, onKey, onStats }) => (
  <section className="stage-bar look-bar" aria-label="Your progress">
    <div className="stage-bar-text">
      <strong>{finished ? "Knitted" : where}</strong>
      <span className="quiet">{finished ? "100%" : percentKnitted(worked, percent)} knitted</span>
    </div>
    <Button variant="quiet" onClick={onKey}>
      Key
    </Button>
    {onStats && (
      <Button variant="quiet" onClick={onStats}>
        Time
      </Button>
    )}
    {finished && canSew ? (
      <Button variant="primary" onClick={onSew}>
        Trace the figures
      </Button>
    ) : (
      <Button variant="primary" onClick={onKnit}>
        {finished ? "See the last stitch" : worked > 0 ? "Keep knitting" : "Start knitting"}
      </Button>
    )}
  </section>
);

/** The way out of the chart, back to the hat: in the top right corner. */
const CloseChart: React.FC<{ to: string }> = ({ to }) => (
  <Link to={to} className="chart-close" aria-label="Close the chart">
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M4 4l10 10M14 4L4 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  </Link>
);

/**
 * The chart, filling the screen: with the knitting panel under it while you
 * knit (`?knitting=1`), the embroidery panel while you sew the figures on
 * (`?embroidery=1`), and otherwise a bar to start from, the key and your
 * time. These replace one another in the address as tabs do, so back leaves
 * the chart, and the cross in the corner goes to the hat.
 */
const KnitChart: React.FC = () => {
  const { patternId } = useParams();
  const saved = useSavedPattern(patternId);
  if (!saved.pattern) {
    return (
      <PageLayout title="Exposure not found">
        <p>
          This exposure is no longer saved in this browser. Saved exposures live
          only on the device that made them. <Link to="/">Back to your exposures</Link>.
        </p>
      </PageLayout>
    );
  }
  return <KnitChartView {...saved} pattern={saved.pattern} />;
};

const KnitChartView: React.FC<{
  pattern: SavedPattern;
  setProgress: (progress: number) => void;
  undo: () => void;
  canUndo: boolean;
  setSewing: (next: EmbroideryProgress, record?: boolean) => void;
  undoSewing: () => void;
  canUndoSewing: boolean;
}> = ({ pattern, setProgress, undo, canUndo, setSewing, undoSewing, canUndoSewing }) => {
  const [params, setParams] = useSearchParams();
  const knitting = params.get(knittingParam) === "1";
  const sewing = !knitting && params.get(embroideryParam) === "1";
  const reading = useHatKnitting(pattern.stitches);
  const { knitting: knitted, stitches, rounds, index, palette } = reading;
  const progress = pattern.progress;
  useTimeRecording(pattern.id, knitting);

  const position = positionOf(stitches, progress, index);
  const counts = totals(index, progress);
  const run = currentRun(stitches, progress, index);
  const time = useKnittingTime(pattern.id, stitches, progress);

  const exploring = !knitting && !sewing && params.get(statsParam) === "1" && time !== undefined;
  const detail = useTimeDetail(exploring ? pattern.id : undefined, stitches, rounds);
  const [layer, setLayer] = useState<Layer>("pace");
  const [speedsOpen, setSpeedsOpen] = useState(false);
  const closeSpeeds = useCallback(() => setSpeedsOpen(false), []);
  const [keyOpen, setKeyOpen] = useState(false);
  const closeKey = useCallback(() => setKeyOpen(false), []);
  const timeOverlay = useMemo(() => (detail ? statsOverlay(detail, layer) : undefined), [detail, layer]);

  const groups = useMemo(() => sewingGroups(pattern.sky, pattern.stitches), [pattern.sky, pattern.stitches]);
  const sewn = useMemo(() => completedSegments(groups, pattern.embroidery), [groups, pattern.embroidery]);
  const segment = sewing ? selectedSegment(groups, pattern.embroidery) : undefined;
  const sewingMarks = useMemo(() => (sewing ? { active: segment?.key, sewn } : undefined), [sewing, segment?.key, sewn]);

  const next = nextStitch(knitted, progress);
  const placeNow = next === undefined ? undefined : regionAt(pattern.sky, knitted, next);

  /*
   * Opening or closing a panel rearranges everything round the chart. Hold
   * the chart where it is on screen rather than letting it jump: by its top
   * right corner, as the box is scrolled across from the right.
   */
  const chartHeld = useRef<{ right: number; top: number }>();
  useLayoutEffect(() => {
    const was = chartHeld.current;
    chartHeld.current = undefined;
    const sheet = document.querySelector(".chart-sheets");
    const scroller = sheet?.closest<HTMLElement>(".chart-scroll");
    if (!was || !sheet || !scroller) return;
    const now = sheet.getBoundingClientRect();
    scroller.scrollTop += now.top - was.top;
    scroller.scrollLeft += now.right - was.right;
  }, [knitting, sewing]);
  const setMode = (mode: "knitting" | "sewing" | "looking" | "timing") => {
    const sheet = document.querySelector(".chart-sheets")?.getBoundingClientRect();
    chartHeld.current = sheet && { right: sheet.right, top: sheet.top };
    const nextParams = new URLSearchParams(params);
    for (const param of [knittingParam, embroideryParam, statsParam]) nextParams.delete(param);
    if (mode === "knitting") nextParams.set(knittingParam, "1");
    if (mode === "sewing") nextParams.set(embroideryParam, "1");
    if (mode === "timing") nextParams.set(statsParam, "1");
    setParams(nextParams, { replace: true });
  };

  const name = pattern.name ?? "Your sky";
  const currentStitch = run ? keyEntryAt(stitches, run.startId, hatStitchNotes)?.id : undefined;

  if (exploring && detail && time) {
    return (
      <PageLayout title={name} showTitle={false} className="knit-screen is-looking is-timing">
        <section className="chart-page">
          <CloseChart to={patternPath(pattern.id)} />
          <HatChart
            hat={pattern.stitches}
            sky={pattern.sky}
            reading={reading}
            progress={progress}
            // Looking back: the edge of the knitting near the top, what is done below it.
            follow
            followAt={0.85}
            overlay={timeOverlay}
            pickerNote={(id) => <StitchTime time={detail} id={id} round={index.roundOf.get(id)} />}
          />
        </section>
        <StatsPanel
          summary={time}
          time={detail}
          finished={position.finished}
          layer={layer}
          onLayer={setLayer}
          onSpeeds={() => setSpeedsOpen(true)}
          onClose={() => setMode("looking")}
        />
        {speedsOpen && <SpeedsSheet stitches={stitches} notes={hatStitchNotes} time={detail} onClose={closeSpeeds} />}
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={name}
      showTitle={false}
      className={knitting ? "knit-screen" : sewing ? "knit-screen is-sewing" : "knit-screen is-looking"}
    >
      <section className="chart-page">
        <CloseChart to={patternPath(pattern.id)} />
        <HatChart
          hat={pattern.stitches}
          sky={pattern.sky}
          reading={reading}
          progress={progress}
          follow={knitting}
          onJump={knitting ? setProgress : undefined}
          sewing={sewingMarks}
          showHatStitch={segment?.from}
        />
      </section>
      {knitting ? (
        <KnittingPanel
          stitches={stitches}
          index={index}
          palette={palette}
          progress={progress}
          setProgress={setProgress}
          onStop={() => setMode("looking")}
          canUndo={canUndo}
          onUndo={undo}
          notes={hatStitchNotes}
          onOpenKey={() => setKeyOpen(true)}
          where={placeNow && regionInfo(placeNow) && <PlaceNow regionKey={placeNow} />}
          finishing={hatFinishing}
        />
      ) : sewing ? (
        <EmbroideryPanel
          groups={groups}
          reading={reading}
          progress={pattern.embroidery}
          onChange={setSewing}
          onStop={() => setMode("looking")}
          canUndo={canUndoSewing}
          onUndo={undoSewing}
        />
      ) : (
        <LookBar
          percent={counts.percent}
          worked={counts.worked}
          where={whereYouAre(position)}
          finished={position.finished}
          canSew={groups.length > 0}
          onKnit={() => setMode("knitting")}
          onSew={() => setMode("sewing")}
          onKey={() => setKeyOpen(true)}
          onStats={time && (() => setMode("timing"))}
        />
      )}
      {keyOpen && (
        <KeySheet stitches={stitches} palette={palette} notes={hatStitchNotes} current={currentStitch} onClose={closeKey} />
      )}
    </PageLayout>
  );
};

export default KnitChart;
