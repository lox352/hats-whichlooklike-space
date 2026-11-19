import React from "react";
import { Stitch } from "../types/Stitch";
import { SkyMarks } from "../types/SkyMarks";
import HatChart from "./HatChart";
import ChartActions from "./ChartActions";
import ChartPrintSheet from "./ChartPrintSheet";
import ConstellationIndex from "./ConstellationIndex";
import WrittenInstructions from "./WrittenInstructions";
import YarnChoicesEditor from "./YarnChoices";
import YarnShoppingList from "./YarnShoppingList";
import { useYarns } from "../useYarns";
import { useHatKnitting } from "../knitting/useHatKnitting";
import "./KnitScreen.css";

interface PatternContentsProps {
  stitches: Stitch[];
  sky: SkyMarks;
  name: string;
  /** What goes between the chart and the extras: the page's own actions. */
  children?: React.ReactNode;
}

/**
 * A sky just charted, before it is saved: the chart, in a window you scroll
 * and pinch inside, with the figures drawn on it, and everything that hangs
 * off it underneath.
 *
 * The chart comes first because it is the thing. The names of the
 * constellations on it, the yarns, the written version and the downloads all
 * matter less than getting on with the knitting, so they sit underneath.
 */
const PatternContents: React.FC<PatternContentsProps> = ({ stitches, sky, name, children }) => {
  const { yarns, setYarns } = useYarns();
  const reading = useHatKnitting(stitches);
  return (
    <>
      <div className="screen-only chart-preview">
        <HatChart hat={stitches} sky={sky} reading={reading} progress={0} />
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
