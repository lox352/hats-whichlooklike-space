import React, { useState } from "react";
import { Stitch } from "../types/Stitch";
import { cssColour, displayYarn, skyColours } from "../helpers/yarn-preference";
import { useYarns } from "../useYarns";
import Button from "./ui/Button";
import NumberField from "./ui/NumberField";

interface YarnShoppingListProps {
  stitches: Stitch[];
}

/** Floats and tails: a fifth on top of what the stitches themselves take. */
const allowance = 1.2;

/**
 * How much of each yarn to buy, from a swatch you have measured.
 *
 * Knit a swatch, unravel a known number of stitches and measure the yarn
 * they took. Everything else is arithmetic on the stitch counts.
 */
const YarnShoppingList: React.FC<YarnShoppingListProps> = ({ stitches }) => {
  const { yarns } = useYarns();
  const [open, setOpen] = useState(false);
  const [metres, setMetres] = useState(3);
  const [swatchStitches, setSwatchStitches] = useState(100);

  const perStitch = Math.max(0, metres) / Math.max(1, swatchStitches);

  return (
    <div className="screen-only">
      <Button variant="quiet" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Hide the shopping list" : "Yarn shopping list"}
      </Button>
      {open && (
        <div className="yarn-editor">
          <p className="chart-extra-note">
            Unravel a known number of stitches from a swatch and measure the
            yarn they took. The estimate adds a fifth for floats and tails;
            keep some extra for the embroidery.
          </p>
          <div className="design-row">
            <NumberField
              label="Metres in that yarn"
              value={metres}
              onChange={setMetres}
              min={0.01}
              step={0.1}
              width="6rem"
            />
            <NumberField
              label="Stitches it made"
              value={swatchStitches}
              onChange={setSwatchStitches}
              min={1}
              width="6rem"
            />
          </div>
          <ul className="shopping-list">
            {skyColours.map((yarn) => {
              const count = stitches.filter(
                (stitch) => stitch.id > 0 && stitch.colour.join(",") === yarn.key
              ).length;
              const needed = perStitch * count * allowance;
              return (
                <li key={yarn.key}>
                  <span
                    aria-hidden="true"
                    className="yarn-swatch"
                    style={{ backgroundColor: cssColour(displayYarn(yarn.colour, yarns).colour) }}
                  />
                  <span className="shopping-list-name">
                    {displayYarn(yarn.colour, yarns).name}
                  </span>
                  <span className="shopping-list-amount">
                    {count.toLocaleString()} stitches · about {Math.ceil(needed)} m
                    ({Math.ceil(needed * 1.09361)} yd)
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default YarnShoppingList;
