import React, { useMemo, useState } from "react";
import { Stitch } from "../types/Stitch";
import { RGB } from "../types/RGB";
import {
  instructionsToText,
  writtenInstructions,
} from "../helpers/written-instructions";
import { useYarns } from "../useYarns";
import { cssColour, displayYarn } from "../helpers/yarn-preference";
import Button from "./ui/Button";

interface WrittenInstructionsProps {
  stitches: Stitch[];
}

/**
 * The pattern in words, collapsed by default.
 *
 * The chart is the better instrument for colourwork: it shows the picture,
 * which prose cannot, and most people will never open this. It is here for
 * working from a screen reader, or for checking a row's stitch count without
 * counting squares, so it is offered quietly rather than given equal billing.
 */
const WrittenInstructions: React.FC<WrittenInstructionsProps> = ({
  stitches,
}) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { yarns } = useYarns();

  const nameOf = useMemo(
    () => (colour: RGB) => displayYarn(colour, yarns).name,
    [yarns]
  );

  const rows = useMemo(
    () => (open ? writtenInstructions(stitches) : []),
    [open, stitches]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(instructionsToText(stitches, nameOf));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="screen-only">
      <Button variant="quiet" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Hide written instructions" : "Written instructions"}
      </Button>

      {open && (
        <div className="written">
          <p className="chart-extra-note">
            Row 1 is the cast-on. Each row is read as you knit it, right to
            left. Knit the colourwork first; the constellation lines are sewn
            on afterwards. k2tog is knit two together; s2kp is slip two
            together knitwise, knit one, pass the two slipped stitches over.
          </p>
          <Button variant="quiet" onClick={copy}>
            Copy all rows
          </Button>
          <span aria-live="polite" className="chart-extra-note">
            {copied && "Copied."}
          </span>
          <ol className="written-rows">
            {rows.map((row) => (
              <li key={row.row}>
                <span className="written-row-label">
                  Row {row.row} ({row.stitches} sts)
                </span>
                <span>
                  {row.segments.map((segment, position) => (
                    <span key={position} className="written-run">
                      {position > 0 && ", "}
                      <span
                        aria-hidden="true"
                        className="yarn-swatch yarn-swatch-small"
                        style={{
                          backgroundColor: cssColour(
                            displayYarn(segment.colour, yarns).colour
                          ),
                        }}
                      />
                      {segment.text} {nameOf(segment.colour)}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default WrittenInstructions;
