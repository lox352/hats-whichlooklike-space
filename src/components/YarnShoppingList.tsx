import { useState } from "react";
import { Stitch } from "../types/Stitch";
import { skyColours, displayYarn } from "../helpers/yarn-preference";
import { useYarns } from "../useYarns";
import NumberField from "./ui/NumberField";
export default function YarnShoppingList({ stitches }: { stitches: Stitch[] }) {
  const { yarns } = useYarns();
  const [metres, setMetres] = useState(3);
  const [swatchStitches, setSwatchStitches] = useState(100);
  return (
    <details className="screen-only">
      <summary>Yarn shopping list</summary>
      <p>
        Measure the yarn used in a swatch. Estimates below add 20% for tails and
        floats; keep extra for long carries and embroidery.
      </p>
      <div className="design-row">
        <NumberField
          label="Swatch yarn (metres)"
          value={metres}
          onChange={setMetres}
          min={0.01}
          step={0.1}
        />
        <NumberField
          label="Stitches in that swatch"
          value={swatchStitches}
          onChange={setSwatchStitches}
          min={1}
        />
      </div>
      <ul>
        {skyColours.map((y) => {
          const count = stitches.filter(
            (s) => s.id > 0 && s.colour.join(",") === y.key,
          ).length;
          const m =
            (Math.max(0, metres) * count * 1.2) / Math.max(1, swatchStitches);
          return (
            <li key={y.key}>
              {displayYarn(y.colour, yarns).name}: {count} stitches · about{" "}
              {Math.ceil(m)} m / {Math.ceil(m * 1.09361)} yd
            </li>
          );
        })}
      </ul>
    </details>
  );
}
