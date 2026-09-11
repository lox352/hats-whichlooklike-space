import React, { useState } from "react";
import { RGB } from "../types/RGB";
import Button from "./ui/Button";
import {
  clearYarns,
  cssColour,
  defaultYarns,
  skyColours,
  writeYarns,
  YarnChoices as Choices,
} from "../helpers/yarn-preference";

interface YarnChoicesProps {
  yarns: Choices;
  setYarns: (yarns: Choices) => void;
}

const hexOf = (colour: RGB) =>
  `#${colour.map((c) => c.toString(16).padStart(2, "0")).join("")}`;

const rgbOf = (hex: string): RGB => {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16) || 0,
    parseInt(value.slice(2, 4), 16) || 0,
    parseInt(value.slice(4, 6), 16) || 0,
  ];
};

/**
 * Name the yarns you are actually knitting with.
 *
 * This only changes how the pattern is shown and described, never how it is
 * generated: the sky picks the stitches, and this decides what to call them
 * and what shade to draw them.
 */
const YarnChoices: React.FC<YarnChoicesProps> = ({ yarns, setYarns }) => {
  const [open, setOpen] = useState(false);

  const update = (key: string, changes: Partial<Choices[string]>) => {
    const next = { ...yarns, [key]: { ...yarns[key], ...changes } };
    setYarns(next);
    writeYarns(next);
  };

  const reset = () => {
    const defaults = defaultYarns();
    setYarns(defaults);
    clearYarns();
  };

  return (
    <div className="screen-only">
      <Button variant="quiet" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Hide your yarns" : "Your yarns"}
      </Button>

      {open && (
        <div className="yarn-editor">
          <p className="chart-extra-note">
            Name the three yarns you are using and set them to their real
            shades. This changes the chart and the key only; which stitches are
            night and which are stars is decided by the sky, not by this.
          </p>
          {skyColours.map(({ key, label }) => (
            <div key={key} className="yarn-choice">
              <span className="yarn-choice-role">{label}</span>
              <input
                type="color"
                aria-label={`Colour for ${label}`}
                value={hexOf(yarns[key].colour)}
                onChange={(e) => update(key, { colour: rgbOf(e.target.value) })}
                className="yarn-choice-colour"
              />
              <input
                type="text"
                aria-label={`Name for ${label}`}
                value={yarns[key].name}
                maxLength={40}
                onChange={(e) => update(key, { name: e.target.value })}
                className="yarn-choice-name"
              />
              <span
                aria-hidden="true"
                className="yarn-swatch"
                style={{ backgroundColor: cssColour(yarns[key].colour) }}
              />
            </div>
          ))}
          <Button variant="quiet" onClick={reset}>
            Back to the sky&rsquo;s own colours
          </Button>
        </div>
      )}
    </div>
  );
};

export default YarnChoices;
