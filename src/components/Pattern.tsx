import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  designFromSearchParams,
  designToSearchParams,
} from "../helpers/design-url";
import { readHat } from "../helpers/design-session";
import { createPattern, bareIdFor } from "../helpers/pattern-storage";
import NameDialog from "./ui/NameDialog";
import Button from "./ui/Button";
import PatternContents from "./PatternContents";
export default function Pattern() {
  const [params] = useSearchParams();
  const design = designFromSearchParams(params);
  const [hat] = useState(() => readHat(design));
  const [naming, setNaming] = useState(false);
  const [problem, setProblem] = useState("");
  const navigate = useNavigate();
  return (
    <main className="page">
      <a href="#/" className="eyebrow">
        Hats which look like space
      </a>
      <h1>Your sky chart</h1>
      {hat ? (
        <>
          <PatternContents
            stitches={hat.stitches}
            sky={hat.sky}
            progress={0}
            name="Sky chart"
          />
          <Button onClick={() => setNaming(true)}>Save pattern</Button>
          <p role="status">{problem}</p>
          <NameDialog
            open={naming}
            title="Name your sky"
            onCancel={() => setNaming(false)}
            onConfirm={(name) => {
              const { result, pattern } = createPattern(
                hat.stitches,
                hat.sky,
                name,
              );
              if (result.ok) navigate(`/pattern/${bareIdFor(pattern.id)}`);
              else {
                setNaming(false);
                setProblem(
                  "Storage is full. Download the chart or remove an older saved pattern.",
                );
              }
            }}
          />
        </>
      ) : (
        <>
          <p>This chart has not been generated in this tab yet.</p>
          <Button
            onClick={() => navigate(`/render?${designToSearchParams(design)}`)}
          >
            Chart this sky
          </Button>
        </>
      )}
    </main>
  );
}
