import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import HatCanvas from "../ChainModel/HatCanvas";
import { readPattern } from "../helpers/pattern-storage";
import Button from "./ui/Button";
export default function SavedRender() {
  const { patternId } = useParams();
  const navigate = useNavigate();
  const pattern = useMemo(() => readPattern(patternId), [patternId]);
  return (
    <main className="page">
      <a href="#/" className="eyebrow">
        Your hats
      </a>
      <h1>{pattern?.name ?? "Saved sky"}</h1>
      {pattern ? (
        <>
          <div className="hat-canvas">
            <HatCanvas
              stitches={pattern.stitches}
              sky={pattern.sky}
              simulationActive={false}
            />
          </div>
          <p>Drag to turn the hat. Pinch to zoom.</p>
          <Button onClick={() => navigate(`/pattern/${patternId}`)}>
            Open knitting chart
          </Button>
        </>
      ) : (
        <p>This pattern is not saved in this browser.</p>
      )}
    </main>
  );
}
