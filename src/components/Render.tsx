import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import HatCanvas from "../ChainModel/HatCanvas";
import { SettleMetrics } from "../helpers/settling";
import { getStitches } from "../helpers/stitches";
import {
  designFromSearchParams,
  designToSearchParams,
} from "../helpers/design-url";
import { cacheHat, readHat } from "../helpers/design-session";
import { emptySky } from "../types/SkyMarks";
import { validateDesign } from "../types/KnittingMachine";
import Button from "./ui/Button";
export default function Render() {
  const [params] = useSearchParams();
  const design = useMemo(() => designFromSearchParams(params), [params]);
  const cached = useMemo(() => readHat(design), [design]);
  const errors = validateDesign(
    design.stitchesPerRow,
    design.numberOfRows,
    design.decreaseMethod,
  );
  const [stitches, setStitches] = useState(
    () =>
      cached?.stitches ??
      (errors.length
        ? []
        : getStitches(
            design.stitchesPerRow,
            design.numberOfRows,
            design.decreaseMethod,
          )),
  );
  const [sky, setSky] = useState(cached?.sky ?? emptySky);
  const [active, setActive] = useState(false);
  const [metrics, setMetrics] = useState<SettleMetrics>();
  const [frameMetrics, setFrameMetrics] = useState<{
    drawCalls: number;
    frameMs: number;
  }>();
  const [ready, setReady] = useState(!!cached);
  const navigate = useNavigate();
  useEffect(() => {
    if (ready) cacheHat(design, stitches, sky);
  }, [ready, design, stitches, sky]);
  const query = designToSearchParams(design).toString();
  return (
    <main className="page">
      <a href="#/" className="eyebrow">
        Hats which look like space
      </a>
      <h1>Charting your sky</h1>
      {errors.length ? (
        <>
          <p role="alert">{errors.map((e) => e.message).join(" ")}</p>
          <Button onClick={() => navigate(`/design?${query}`)}>
            Edit design
          </Button>
        </>
      ) : (
        <>
          <div className="hat-canvas">
            <HatCanvas
              stitches={stitches}
              setStitches={cached ? undefined : setStitches}
              sky={sky}
              setSky={setSky}
              orientationParameters={design.orientation}
              onReady={() => setReady(true)}
              onMetrics={setMetrics}
              onFrameMetrics={
                params.has("diagnostics") ? setFrameMetrics : undefined
              }
              simulationActive={active}
              setSimulationActive={cached ? undefined : setActive}
            />
          </div>
          <p role="status">
            {ready
              ? "Your sky is ready. Drag to turn the hat; pinch to zoom."
              : "Letting the stitches settle into a hat…"}
          </p>
          <div className="actions">
            <Button
              variant="primary"
              disabled={!ready}
              onClick={() => navigate(`/pattern?${query}`)}
            >
              Open knitting chart
            </Button>
            <Button
              variant="quiet"
              onClick={() => navigate(`/design?${query}`)}
            >
              Edit design
            </Button>
          </div>
          {params.has("diagnostics") && (
            <output className="diagnostics">
              {JSON.stringify({ settle: metrics, frames: frameMetrics })}
            </output>
          )}
          <label className="share-link">
            Share this design
            <input
              readOnly
              value={`${window.location.origin}${window.location.pathname}#/design?${query}`}
              onFocus={(e) => e.target.select()}
            />
          </label>
        </>
      )}
    </main>
  );
}
