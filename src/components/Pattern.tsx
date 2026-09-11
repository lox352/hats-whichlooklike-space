import React from "react";
import { Stitch } from "../types/Stitch";
import KnittingPattern from "../KnittingPattern";
import { SkyMarks } from "../types/SkyMarks";
import { createPattern } from "../helpers/pattern-storage";

interface PatternProps {
  stitches: Stitch[];
  sky: SkyMarks;
}

const saveToLocalStorage = (
  stitches: Stitch[],
  sky: SkyMarks,
  setPatternSaved: React.Dispatch<boolean>
) => {
  const patternName = prompt("Please enter a name for your pattern:");
  if (patternName === null) {
    return;
  }
  const { result, pattern } = createPattern(stitches, sky, patternName);
  if (!result.ok) {
    alert(
      "Local storage is full. Please delete a pattern from the home page and try again."
    );
    return;
  }
  window.location.hash = `#/pattern/${pattern.id.replace(/^pattern-/, "")}`;
  setPatternSaved(true);
  alert(
    "Stitches saved to local storage! This pattern may be accessed at any time from the homepage."
  );
};

const Pattern: React.FC<PatternProps> = ({ stitches, sky }) => {
  const [patternSaved, setPatternSaved] = React.useState(false);

  return (
    <div style={{ textAlign: "left", padding: "20px" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "20px" }}>Hat Pattern</h1>
      <KnittingPattern stitches={stitches} sky={sky} progress={0} />
      <div style={{ textAlign: "right" }}>
        <button
          style={{
            marginTop: "20px",
            backgroundColor: "#f44336",
            color: "white",
            padding: "10px 20px",
            marginRight: "10px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={() => {
            window.location.hash = "#/";
          }}
        >
          Start Again
        </button>
        {!patternSaved && (
          <button
            style={{
              marginTop: "20px",
              backgroundColor: "#3f51b5",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            onClick={() => saveToLocalStorage(stitches, sky, setPatternSaved)}
          >
            Save Pattern
          </button>
        )}
      </div>
    </div>
  );
};

export default Pattern;
