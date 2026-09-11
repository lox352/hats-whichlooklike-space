import { constellationName } from "../data/constellation-names";
import YarnShoppingList from "./YarnShoppingList";
import { Stitch } from "../types/Stitch";
import { SkyMarks } from "../types/SkyMarks";
import KnittingPattern from "../KnittingPattern";
import ChartActions from "./ChartActions";
import ChartPrintSheet from "./ChartPrintSheet";
import WrittenInstructions from "./WrittenInstructions";
import YarnChoices from "./YarnChoices";
import { useYarns } from "../useYarns";
export default function PatternContents({
  stitches,
  sky,
  progress,
  name,
  followProgress = false,
  activeSegment,
  sewnSegments,
}: {
  stitches: Stitch[];
  sky: SkyMarks;
  progress: number;
  name: string;
  followProgress?: boolean;
  activeSegment?: string;
  sewnSegments?: string[];
}) {
  const { yarns, setYarns } = useYarns();
  return (
    <>
      <p>
        Knit the sky in three yarns. The connecting lines are embroidery: sew
        them after the knitting is complete, using small backstitches. A line
        leaving the brim is a guide to sky beyond the hat; do not sew to its
        missing endpoint.
      </p>
      <div className="screen-only">
        <KnittingPattern
          stitches={stitches}
          sky={sky}
          progress={progress}
          followProgress={followProgress}
          activeSegment={activeSegment}
          sewnSegments={sewnSegments}
        />
      </div>
      <ChartPrintSheet stitches={stitches} sky={sky} title={name} />
      <details className="screen-only">
        <summary>
          Constellations on this hat ({sky.constellations.length})
        </summary>
        <p>
          {sky.constellations
            .map((c) => constellationName(c.abbreviation))
            .join(" · ")}
        </p>
      </details>
      <YarnShoppingList stitches={stitches} />
      <div className="chart-extras screen-only">
        <YarnChoices yarns={yarns} setYarns={setYarns} />
        <WrittenInstructions stitches={stitches} />
        <ChartActions stitches={stitches} sky={sky} name={name} />
      </div>
    </>
  );
}
