import React from "react";
import { Stitch } from "../types/Stitch";
import { SkyMarks } from "../types/SkyMarks";
import KnittingPattern from "../KnittingPattern";
import ChartActions from "./ChartActions";
import ChartPrintSheet from "./ChartPrintSheet";
import ConstellationIndex from "./ConstellationIndex";
import WrittenInstructions from "./WrittenInstructions";
import YarnChoicesEditor from "./YarnChoices";
import YarnShoppingList from "./YarnShoppingList";
import { useYarns } from "../useYarns";

interface PatternContentsProps {
  stitches: Stitch[];
  sky: SkyMarks;
  progress: number;
  name: string;
  followProgress?: boolean;
  activeSegment?: string;
  sewnSegments?: string[];
  /** What goes between the chart and the extras: the page's own actions. */
  children?: React.ReactNode;
}

/**
 * The chart and everything that hangs off it, shared by the fresh chart and
 * the saved one.
 *
 * The chart comes first because it is the thing. The names of the
 * constellations on it, the yarns, the written version and the downloads all
 * matter less than getting on with the knitting, so they sit underneath.
 */
const PatternContents: React.FC<PatternContentsProps> = ({
  stitches,
  sky,
  progress,
  name,
  followProgress = false,
  activeSegment,
  sewnSegments,
  children,
}) => {
  const { yarns, setYarns } = useYarns();
  return (
    <>
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

      {children}

      <div className="chart-extras screen-only">
        <ConstellationIndex sky={sky} />
        <YarnShoppingList stitches={stitches} />
        <YarnChoicesEditor yarns={yarns} setYarns={setYarns} />
        <WrittenInstructions stitches={stitches} />
        <ChartActions stitches={stitches} sky={sky} name={name} />
      </div>
    </>
  );
};

export default PatternContents;
