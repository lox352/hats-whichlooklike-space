import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SavedPattern } from "../types/SavedPattern";

const buttonStyle = {
  backgroundColor: "#3f51b5",
  color: "white",
  padding: "5px 10px",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  marginRight: "5px",
  marginTop: "5px",
};

const deleteButtonStyle = {
  ...buttonStyle,
  backgroundColor: "#f44336",
};

const PreviousPatterns: React.FC<{ patterns: SavedPattern[] }> = ({
  patterns,
}) => {
  const navigate = useNavigate();

  if (patterns.length === 0) {
    return null;
  }
  
  return (
    <div style={{ marginTop: "40px" }}>
      <h2 style={{ fontSize: "2rem", marginBottom: "20px" }}>
        Previous Patterns
      </h2>
      <ul style={{ listStyleType: "none", padding: 0 }}>
        {patterns.map((pattern) => {
          const id = pattern.id.replace("pattern-", "");
          return (
            <li
              key={id}
              style={{
                marginBottom: "10px",
                borderBottom: "1px solid white",
                paddingBottom: "10px",
              }}
            >
              <h3
                style={{
                  fontSize: "1.5rem",
                  marginBottom: "0px",
                  marginTop: "0px",
                  display: "inline-block",
                }}
              >
                {pattern.name ?? "Saved Pattern"}
              </h3>
              <div>
                Saved on{" "}
                {new Date(parseInt(id)).toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  hour12: true,
                })}
              </div>
              <button
                style={buttonStyle}
                onClick={() => navigate(`/pattern/${id}`)}
              >
                View Pattern
              </button>
              <button
                style={{ ...buttonStyle }}
                onClick={() => navigate(`/render/${id}`)}
              >
                Visualise Hat
              </button>
              <button
                style={{ ...buttonStyle }}
                onClick={() => {
                  const newName = prompt(
                    "Enter new name for the pattern:",
                    pattern.name ?? "Saved Pattern"
                  );
                  if (newName !== pattern.name) {
                    const updatedPattern = { ...pattern, name: newName };
                    localStorage.setItem(
                      pattern.id,
                      JSON.stringify(updatedPattern)
                    );
                    window.dispatchEvent(new CustomEvent("storageUpdated"));
                  }
                }}
              >
                Rename
              </button>
              <button
                style={deleteButtonStyle}
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete this pattern?"
                    )
                  ) {
                    localStorage.removeItem(`pattern-${id}`);
                    window.dispatchEvent(new CustomEvent("storageUpdated"));
                  }
                }}
              >
                Delete
              </button>
              <div style={{ marginTop: "5px", fontStyle: "italic" }}>
                {((100 * pattern.progress) / pattern.stitches.length).toFixed(
                  2
                )}
                % completed
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const getSavedPatterns = (): SavedPattern[] => {
  return Object.keys(localStorage)
    .filter((key) => key.startsWith("pattern-"))
    .map((key) => localStorage.getItem(key)!)
    .map((item) => JSON.parse(item) as SavedPattern);
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [savedPatterns, setSavedPatterns] = React.useState<SavedPattern[]>(
    getSavedPatterns()
  );

  const handleBegin = () => {
    navigate("/design");
  };

  useEffect(() => {
    const handleStorageChange = () => {
      setSavedPatterns(getSavedPatterns());
    };

    window.addEventListener("storageUpdated", handleStorageChange);

    return () => {
      window.removeEventListener("storageUpdated", handleStorageChange);
    };
  }, []);

  return (
    <div style={{ textAlign: "left", padding: "20px" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "20px" }}>
        Hats Which Look Like Space
      </h1>
      <p style={{ fontSize: "1rem", marginBottom: "20px" }}>
        Knit a hat which looks like the night sky. Begin by designing your hat, then
        render it, and finally generate the pattern.
      </p>
      <button
        style={{
          backgroundColor: "#3f51b5",
          color: "white",
          padding: "10px 20px",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
        onClick={handleBegin}
      >
        Begin
      </button>
      <PreviousPatterns patterns={savedPatterns} />
    </div>
  );
};

export default Home;
