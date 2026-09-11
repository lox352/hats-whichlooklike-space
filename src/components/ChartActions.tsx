import React, { useState } from "react";
import { Stitch } from "../types/Stitch";
import { SkyMarks } from "../types/SkyMarks";
import { downloadChartPng, downloadChartSvg } from "../helpers/chart-export";
import { useYarns } from "../useYarns";
import Button from "./ui/Button";

interface ChartActionsProps {
  stitches: Stitch[];
  sky: SkyMarks;
  /** Used as the download filename. */
  name: string;
}

const safeFilename = (name: string) =>
  name
    .trim()
    .replace(/[^a-z0-9\-_ ]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase() || "sky-chart";

/** Print the chart, or take it away as a file. */
const ChartActions: React.FC<ChartActionsProps> = ({ stitches, sky, name }) => {
  const { yarns } = useYarns();
  const [problem, setProblem] = useState<string | null>(null);

  const withReporting = (action: () => void | Promise<void>) => async () => {
    setProblem(null);
    try {
      await action();
    } catch {
      setProblem("Could not produce that file. Try printing instead.");
    }
  };

  return (
    <div className="chart-actions screen-only">
      <Button variant="quiet" onClick={() => window.print()}>
        Print
      </Button>
      <Button
        variant="quiet"
        onClick={withReporting(() =>
          downloadChartSvg(stitches, safeFilename(name), yarns, sky)
        )}
      >
        Download SVG
      </Button>
      <Button
        variant="quiet"
        onClick={withReporting(() =>
          downloadChartPng(stitches, safeFilename(name), yarns, 3, sky)
        )}
      >
        Download PNG
      </Button>
      {problem && (
        <span role="alert" className="chart-actions-problem">
          {problem}
        </span>
      )}
    </div>
  );
};

export default ChartActions;
