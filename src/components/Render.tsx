import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import HatCanvas from "../ChainModel/HatCanvas";
import { Stitch } from "../types/Stitch";
import { emptySky, SkyMarks } from "../types/SkyMarks";
import { getStitches } from "../helpers/stitches";
import { validateDesign } from "../types/KnittingMachine";
import { designFromSearchParams, designKey } from "../helpers/design-url";
import { cacheHat, readHat } from "../helpers/design-session";
import PageLayout from "./ui/PageLayout";
import Button from "./ui/Button";
import "./Render.css";

type Stage = "summoning" | "settling" | "charting" | "done";

/*
 * The status reads as an exposure: the shutter opens, the light comes in,
 * the image develops.
 */
const statusText: Record<Stage, string> = {
  summoning: "Casting on...",
  settling: "Shutter open: the stitches settle into a hat...",
  charting: "Developing: each star lands on the stitch it sits over...",
  done: "Drag to turn the hat; pinch or scroll to look closer.",
};

/**
 * Stages only ever move forward. The physics signals and the charting signal
 * arrive from different places, and charting can finish before React has
 * processed the "simulation stopped" update, so ordering must not matter.
 */
const stageOrder: Stage[] = ["summoning", "settling", "charting", "done"];

const Render: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const design = useMemo(
    () => designFromSearchParams(searchParams),
    [searchParams]
  );
  const key = designKey(design);

  const [stitches, setStitches] = useState<Stitch[]>([]);
  const [sky, setSky] = useState<SkyMarks>(emptySky);
  const [stage, setStage] = useState<Stage>("summoning");
  const [simulationActive, setSimulationActive] = useState(false);
  // A hat restored from the session cache is already charted, so it must not
  // be handed to the simulation again.
  const [restored, setRestored] = useState(false);
  const simulationHasRun = useRef(false);
  const knittedFor = useRef<string | null>(null);

  const advanceTo = useCallback(
    (next: Stage) =>
      setStage((current) =>
        stageOrder.indexOf(next) > stageOrder.indexOf(current) ? next : current
      ),
    []
  );

  const handleReady = useCallback(() => advanceTo("done"), [advanceTo]);

  // Knit the hat this URL asks for. Re-runs when the design changes, so
  // going back, editing and returning gives the hat you asked for rather than
  // whatever was last in memory.
  useEffect(() => {
    if (knittedFor.current === key) return;
    knittedFor.current = key;

    const cached = readHat(design);
    if (cached) {
      setStitches(cached.stitches);
      setSky(cached.sky);
      setRestored(true);
      setStage("done");
      return;
    }

    if (
      validateDesign(
        design.stitchesPerRow,
        design.numberOfRows,
        design.decreaseMethod
      ).length > 0
    ) {
      navigate(`/design?${searchParams.toString()}`, { replace: true });
      return;
    }

    setRestored(false);
    setStage("summoning");
    simulationHasRun.current = false;
    setSky(emptySky());
    setStitches(
      getStitches(
        design.stitchesPerRow,
        design.numberOfRows,
        design.decreaseMethod
      )
    );
  }, [key, design, navigate, searchParams]);

  useEffect(() => {
    if (restored) return;
    if (simulationActive) {
      simulationHasRun.current = true;
      advanceTo("settling");
      return;
    }
    if (simulationHasRun.current) {
      advanceTo("charting");
    }
  }, [simulationActive, advanceTo, restored]);

  // Keep the charted hat for the rest of the tab, so reloading the chart does
  // not mean waiting for the simulation again.
  useEffect(() => {
    if (stage !== "done" || restored) return;
    cacheHat(design, stitches, sky);
  }, [stage, restored, design, stitches, sky]);

  const working = stage !== "done";

  if (stitches.length === 0) {
    return (
      <PageLayout title="Exposing your sky" step="sky">
        <p className="render-status render-status-working">Casting on...</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Exposing your sky"
      step="sky"
      lede="The knitted tube settles into a hat, and the sky you chose is exposed onto it, star by star."
    >
      <div className="hat-stage">
        <HatCanvas
          stitches={stitches}
          setStitches={restored ? undefined : setStitches}
          sky={sky}
          setSky={setSky}
          orientationParameters={design.orientation}
          simulationActive={simulationActive}
          setSimulationActive={restored ? undefined : setSimulationActive}
          onReady={handleReady}
        />
      </div>
      <p
        aria-live="polite"
        className={`render-status${working ? " render-status-working" : ""}`}
      >
        {statusText[stage]}
      </p>
      {stage === "done" && (
        <div className="render-actions">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate(`/pattern?${searchParams.toString()}`)}
          >
            Develop the print
          </Button>
          <Button
            variant="quiet"
            onClick={() => navigate(`/design?${searchParams.toString()}`)}
          >
            Back to the frame
          </Button>
        </div>
      )}
    </PageLayout>
  );
};

export default Render;
