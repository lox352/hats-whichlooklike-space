import React, { useState } from "react";
import { SkyMarks } from "../types/SkyMarks";
import { constellationName } from "../data/constellation-names";
import Button from "./ui/Button";

interface ConstellationIndexProps {
  sky: SkyMarks;
}

/**
 * Which constellations are on this hat, by name.
 *
 * The identities were always computed and stored - every line is keyed by
 * its constellation - but for a long time nothing read them, so a hat was a
 * field of anonymous lines. This is the index of the plate.
 */
const ConstellationIndex: React.FC<ConstellationIndexProps> = ({ sky }) => {
  const [open, setOpen] = useState(false);
  const names = sky.constellations
    .map((constellation) => constellationName(constellation.abbreviation))
    .sort((a, b) => a.localeCompare(b));

  if (names.length === 0) return null;

  return (
    <div className="screen-only">
      <Button variant="quiet" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open
          ? "Hide the constellations"
          : `Constellations on this hat (${names.length})`}
      </Button>
      {open && (
        <p className="constellation-index">
          {names.map((name, i) => (
            <React.Fragment key={name}>
              {i > 0 && <span aria-hidden="true"> · </span>}
              <span className="constellation-index-name">{name}</span>
            </React.Fragment>
          ))}
        </p>
      )}
    </div>
  );
};

export default ConstellationIndex;
