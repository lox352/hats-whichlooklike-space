import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SavedPattern as Pattern } from "../types/SavedPattern";
import ChainModel from "../ChainModel/ChainModel";
import { destringify } from "../types/Stitch";

const SavedRender: React.FC = () => {
  const navigate = useNavigate();
  const [anyStichRendered, setAnyStitchRendered] = React.useState(false);
  const [loadingPattern, setLoadingPattern] = React.useState(false);

  const params = useParams();
  const patternId = params.patternId;
  if (!patternId) {
    return "Could not find pattern";
  }
  const patternJson = localStorage.getItem(`pattern-${patternId}`);
  if (!patternJson) {
    return "Could not find pattern";
  }
  const pattern: Pattern = JSON.parse(patternJson);

  const thereAreStitches = pattern.stitches.length > 0;
  if (!thereAreStitches) {
    return null;
  }

  return (
    <div style={{ textAlign: "left", padding: "20px" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "20px" }}>Pre-dyed Hat</h1>
      <div style={{ height: "350px" }}>
        <ChainModel
          stitches={pattern.stitches.map(destringify)}
          simulationActive={false}
          onAnyStitchRendered={() => {
            setAnyStitchRendered(true);
          }}
        />
      </div>
      <i>
        {!anyStichRendered
          ? "Summoning stitches..."
          : "Pinch and zoom to see the pattern in more detail"}
      </i>
      <div style={{ marginTop: "10px" }}>
        <button
          style={{
        backgroundColor: "#3f51b5",
        color: "white",
        padding: "10px 20px",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
          }}
          onClick={() => {
        setLoadingPattern(true);
        navigate(`/pattern/${patternId}`);
          }}
        >
          {loadingPattern ? "Pattern loading..." : "Go to Pattern"}
        </button>
      </div>
    </div>
  );
};

export default SavedRender;
