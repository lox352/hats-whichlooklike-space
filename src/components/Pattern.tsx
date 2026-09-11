import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PatternContents from "./PatternContents";
import PageLayout from "./ui/PageLayout";
import Button from "./ui/Button";
import NameDialog from "./ui/NameDialog";
import { bareIdFor, createPattern } from "../helpers/pattern-storage";
import { designFromSearchParams } from "../helpers/design-url";
import { readHat } from "../helpers/design-session";

/**
 * The chart for a sky that has just been charted, before it is saved.
 *
 * The hat lives in the tab's session cache rather than in memory here, so a
 * reload still finds it. Derived rather than held in state: the design can
 * change under us without the component remounting, and a stale copy would
 * chart the previous hat under the new design's URL.
 */
const Pattern: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const design = useMemo(
    () => designFromSearchParams(searchParams),
    [searchParams]
  );
  const hat = useMemo(() => readHat(design), [design]);

  const [naming, setNaming] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (hat) return;
    // Nothing charted for this design in this tab: go and chart it, rather
    // than showing an empty page.
    navigate(`/render?${searchParams.toString()}`, { replace: true });
  }, [hat, navigate, searchParams]);

  if (!hat) return null;

  const save = (name: string) => {
    setNaming(false);
    const { result, pattern } = createPattern(hat.stitches, hat.sky, name);
    if (!result.ok) {
      setProblem(
        "This browser is out of storage. Delete an exposure from the home page and try again."
      );
      return;
    }
    navigate(`/pattern/${bareIdFor(pattern.id)}`);
  };

  return (
    <PageLayout
      title="Your print"
      step="pattern"
      lede="The exposure as a chart. Save it to tick stitches off as you knit, or take it away as a file."
    >
      <PatternContents
        stitches={hat.stitches}
        sky={hat.sky}
        progress={0}
        name="Sky chart"
      >
        <div className="render-actions screen-only">
          <Button variant="primary" size="lg" onClick={() => setNaming(true)}>
            Save this exposure
          </Button>
          <Button
            variant="quiet"
            onClick={() => navigate(`/design?${searchParams.toString()}`)}
          >
            Back to the frame
          </Button>
          {problem && (
            <span role="alert" className="render-problem">
              {problem}
            </span>
          )}
        </div>
      </PatternContents>

      <NameDialog
        open={naming}
        title="Name this exposure"
        text="So you can find it again in your exposures."
        initialValue="My sky"
        onConfirm={save}
        onCancel={() => setNaming(false)}
      />
    </PageLayout>
  );
};

export default Pattern;
