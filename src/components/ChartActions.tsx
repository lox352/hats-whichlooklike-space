import { useState } from "react";
import { Stitch } from "../types/Stitch";
import { SkyMarks } from "../types/SkyMarks";
import { downloadChartSvg, downloadChartPng } from "../helpers/chart-export";
import { useYarns } from "../useYarns";
import Button from "./ui/Button";
export default function ChartActions({
  stitches,
  sky,
  name,
}: {
  stitches: Stitch[];
  sky: SkyMarks;
  name: string;
}) {
  const { yarns } = useYarns(),
    [problem, setProblem] = useState("");
  const file =
    name
      .trim()
      .replace(/[^a-z0-9\-_ ]/gi, "")
      .replace(/\s+/g, "-")
      .toLowerCase() || "sky-chart";
  const download = async (png: boolean) => {
    try {
      setProblem("");
      if (png) await downloadChartPng(stitches, file, yarns, 3, sky);
      else downloadChartSvg(stitches, file, yarns, sky);
    } catch {
      setProblem("Could not export the chart. Try printing instead.");
    }
  };
  return (
    <div className="actions screen-only">
      <Button variant="quiet" onClick={() => window.print()}>
        Print
      </Button>
      <Button variant="quiet" onClick={() => download(false)}>
        Download SVG
      </Button>
      <Button variant="quiet" onClick={() => download(true)}>
        Download PNG
      </Button>
      <span role="alert">{problem}</span>
    </div>
  );
}
