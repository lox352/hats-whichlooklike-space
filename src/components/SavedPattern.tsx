import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { SavedPattern as Pattern } from "../types/SavedPattern";
import { EmbroideryProgress } from "../types/SkyMarks";
import PatternContents from "./PatternContents";
import KnittingMode from "./KnittingMode";
import EmbroideryMode from "./EmbroideryMode";
import PageLayout from "./ui/PageLayout";
import Button from "./ui/Button";
import ProgressRing from "./ProgressRing";
import FinishedBanner from "./FinishedBanner";
import {
  embroideryParam,
  knittableStitchCount,
  knittingParam,
  patternsChangedEvent,
  percentComplete,
  readPattern,
  setEmbroidery,
  setProgress,
} from "../helpers/pattern-storage";
import {
  completedSegments,
  embroideryPercent,
  selectedSegment,
  sewingGroups,
} from "../helpers/embroidery";

type Mode = "reading" | "knitting" | "embroidering";

const SavedPattern: React.FC = () => {
  const { patternId } = useParams();
  const navigate = useNavigate();

  /*
   * The mode is in the URL, not just in state, for two reasons: the home page
   * links straight into it, so "Keep knitting" is one tap rather than two,
   * and putting the phone down mid-row and coming back to the page leaves you
   * where you were. Knitting and embroidery are two modes of the same page,
   * never both at once: you sew onto a finished sky.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: Mode =
    searchParams.get(embroideryParam) === "1"
      ? "embroidering"
      : searchParams.get(knittingParam) === "1"
        ? "knitting"
        : "reading";

  const setMode = useCallback(
    (next: Mode) => {
      setSearchParams(
        (params) => {
          const nextParams = new URLSearchParams(params);
          nextParams.delete(knittingParam);
          nextParams.delete(embroideryParam);
          if (next === "knitting") nextParams.set(knittingParam, "1");
          if (next === "embroidering") nextParams.set(embroideryParam, "1");
          return nextParams;
        },
        // Replace, so leaving a mode is not a step to go back through.
        { replace: true }
      );
    },
    [setSearchParams]
  );

  /*
   * Miscounting is the normal failure mode when knitting, so every change is
   * pushed onto a stack that can be walked back. Kept in memory only: it is
   * for the session you are knitting in, not something to persist. Sewing
   * has its own stack, since it has its own progress.
   */
  const [undoStack, setUndoStack] = useState<number[]>([]);
  const [sewingUndoStack, setSewingUndoStack] = useState<EmbroideryProgress[]>([]);
  const [savedPattern, setSavedPattern] = useState<Pattern | undefined>(() =>
    readPattern(patternId)
  );
  const [problem, setProblem] = useState<string | null>(null);

  const refresh = useCallback(
    () => setSavedPattern(readPattern(patternId)),
    [patternId]
  );

  useEffect(() => {
    refresh();
    window.addEventListener(patternsChangedEvent, refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(patternsChangedEvent, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const groups = useMemo(
    () => (savedPattern ? sewingGroups(savedPattern.sky, savedPattern.stitches) : []),
    [savedPattern]
  );

  const report = (result: { ok: boolean } | undefined) => {
    setProblem(result?.ok ? null : "Could not save that. This browser may be out of storage.");
  };

  const commitProgress = (next: number) => {
    if (!savedPattern) return;
    if (next === savedPattern.progress) return;
    setUndoStack((stack) => [...stack.slice(-199), savedPattern.progress]);
    report(setProgress(savedPattern.id, next));
  };

  const undo = () => {
    if (!savedPattern) return;
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      report(setProgress(savedPattern.id, stack[stack.length - 1]));
      return stack.slice(0, -1);
    });
  };

  const commitSewing = (next: EmbroideryProgress, record = true) => {
    if (!savedPattern) return;
    if (record) {
      setSewingUndoStack((stack) => [...stack.slice(-199), savedPattern.embroidery]);
    }
    report(setEmbroidery(savedPattern.id, next));
  };

  const undoSewing = () => {
    if (!savedPattern) return;
    setSewingUndoStack((stack) => {
      if (stack.length === 0) return stack;
      report(setEmbroidery(savedPattern.id, stack[stack.length - 1]));
      return stack.slice(0, -1);
    });
  };

  if (!savedPattern) {
    return (
      <PageLayout title="Pattern not found">
        <p>
          This pattern is no longer saved in this browser. Saved patterns live
          only on the device that made them.
        </p>
        <Button variant="primary" onClick={() => navigate("/")}>
          Back to your skies
        </Button>
      </PageLayout>
    );
  }

  const knitted = percentComplete(savedPattern);
  const sewn = embroideryPercent(savedPattern);
  const name = savedPattern.name ?? "Saved sky";
  const knittingDone = knitted >= 100;
  const sewingDone = groups.length === 0 || sewn >= 100;
  const reading = mode === "reading";

  return (
    <PageLayout title={name} step="pattern">
      {knittingDone && reading && (
        <FinishedBanner
          stitches={knittableStitchCount(savedPattern)}
          sewn={sewingDone}
        />
      )}

      <PatternContents
        stitches={savedPattern.stitches}
        sky={savedPattern.sky}
        progress={savedPattern.progress}
        name={name}
        followProgress={mode === "knitting"}
        activeSegment={
          mode === "embroidering"
            ? selectedSegment(groups, savedPattern.embroidery)?.key
            : undefined
        }
        sewnSegments={
          mode === "embroidering"
            ? [...completedSegments(groups, savedPattern.embroidery)]
            : undefined
        }
      >
        {reading && (
          <div className="render-actions screen-only">
            {knittingDone ? (
              sewingDone ? (
                <Button variant="primary" size="lg" onClick={() => navigate("/design")}>
                  Chart another sky
                </Button>
              ) : (
                <Button variant="primary" size="lg" onClick={() => setMode("embroidering")}>
                  {sewn > 0 ? "Keep embroidering" : "Embroider the constellations"}
                </Button>
              )
            ) : (
              <Button variant="primary" size="lg" onClick={() => setMode("knitting")}>
                {knitted > 0 ? "Keep knitting" : "Start knitting"}
              </Button>
            )}
            {knittingDone ? (
              <Button variant="quiet" onClick={() => setMode("knitting")}>
                Adjust the count
              </Button>
            ) : (
              groups.length > 0 && (
                <Button variant="quiet" onClick={() => setMode("embroidering")}>
                  Embroider early
                </Button>
              )
            )}
            <Button variant="quiet" onClick={() => navigate("/")}>
              Back to your skies
            </Button>
            <span className="progress-summary">
              <ProgressRing percent={knitted} label={`${knitted.toFixed(0)}% knitted`} />
              {knitted.toFixed(1)}% knitted
              {groups.length > 0 && (
                <>
                  <ProgressRing percent={sewn} label={`${sewn.toFixed(0)}% embroidered`} />
                  {sewn.toFixed(1)}% sewn
                </>
              )}
            </span>
            {problem && (
              <span role="alert" className="render-problem">
                {problem}
              </span>
            )}
          </div>
        )}
      </PatternContents>

      {mode === "knitting" && (
        <KnittingMode
          stitches={savedPattern.stitches}
          progress={savedPattern.progress}
          setProgress={commitProgress}
          onStop={() => setMode("reading")}
          canUndo={undoStack.length > 0}
          onUndo={undo}
        />
      )}

      {mode === "embroidering" && (
        <EmbroideryMode
          groups={groups}
          stitches={savedPattern.stitches}
          progress={savedPattern.embroidery}
          onChange={commitSewing}
          onStop={() => setMode("reading")}
          canUndo={sewingUndoStack.length > 0}
          onUndo={undoSewing}
        />
      )}
    </PageLayout>
  );
};

export default SavedPattern;
