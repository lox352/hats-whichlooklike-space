import { useState } from "react";
import { RGB } from "../types/RGB";
import {
  clearYarns,
  defaultYarns,
  skyColours,
  writeYarns,
  YarnChoices as Choices,
} from "../helpers/yarn-preference";
import Button from "./ui/Button";
const hexOf = (c: RGB) =>
  `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
const rgbOf = (hex: string): RGB => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
export default function YarnChoices({
  yarns,
  setYarns,
}: {
  yarns: Choices;
  setYarns: (yarns: Choices) => void;
}) {
  const [open, setOpen] = useState(false);
  const update = (key: string, changes: Partial<Choices[string]>) => {
    const next = { ...yarns, [key]: { ...yarns[key], ...changes } };
    setYarns(next);
    writeYarns(next);
  };
  return (
    <section>
      <Button
        variant="quiet"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? "Hide your yarns" : "Your yarns"}
      </Button>
      {open && (
        <div className="yarn-editor">
          <p>
            Give your three yarns their real names and shades. Star positions
            stay the same.
          </p>
          {skyColours.map(({ key, label }) => (
            <div className="yarn-choice" key={key}>
              <label>
                {label}
                <input
                  type="color"
                  aria-label={`Colour for ${label}`}
                  value={hexOf(yarns[key].colour)}
                  onChange={(e) =>
                    update(key, { colour: rgbOf(e.target.value) })
                  }
                />
              </label>
              <input
                type="text"
                aria-label={`Name for ${label}`}
                maxLength={40}
                value={yarns[key].name}
                onChange={(e) => update(key, { name: e.target.value })}
              />
            </div>
          ))}
          <Button
            variant="quiet"
            onClick={() => {
              setYarns(defaultYarns());
              clearYarns();
            }}
          >
            Restore the sky colours
          </Button>
        </div>
      )}
    </section>
  );
}
