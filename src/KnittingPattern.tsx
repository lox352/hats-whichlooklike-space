import React from "react";
import { Stitch } from "./types/Stitch";

interface KnittingPatternProps {
  stitches: Stitch[];
  progress: number;
}

interface StitchPosition {
  row: number;
  col: number;
}

const LabelRight: React.FC<{
  row: number;
  col: number;
  children: React.ReactNode;
}> = ({ row, col, children }) => (
  <div
    className="grid-label"
    id={`label-row-${row}-col-${col}`}
    style={{
      gridRow: row,
      gridColumn: col,
      backgroundColor: "rgb(20, 20, 20)",
      color: "white",
      textAlign: "right",
      aspectRatio: "1 / 1",
      position: "relative",
      right: 0,
      paddingLeft: "2px",
    }}
  >
    {children}
  </div>
);

const LabelBottom: React.FC<{
  row: number;
  col: number;
  children: React.ReactNode;
}> = ({ row, col, children }) => (
  <div
    className="grid-label"
    id={`label-row-${row}-col-${col}`}
    style={{
      gridRow: row,
      gridColumn: col,
      backgroundColor: "rgb(20, 20, 20)",
      color: "white",
      textAlign: "left",
      aspectRatio: "1 / 1",
      position: "relative",
      bottom: 0,
    }}
  >
    {children}
  </div>
);

const StitchBox: React.FC<{
  stitch: Stitch;
  position: StitchPosition;
  numRows: number;
  numCols: number;
  completed: boolean;
}> = ({ stitch, position, numRows, numCols, completed }) => (
  <div
    key={`stitch-${stitch.id}-row-${position.row}-col-${position.col}`}
    id={`stitch-${stitch.id}-row-${position.row}-col-${position.col}`}
    style={{
      gridRow: numRows + position.row,
      gridColumn: numCols + position.col,
      backgroundColor: `rgb(${stitch.colour.join(",")})`,
      border: "1px solid rgb(20, 50, 50)",
      borderLeftWidth: (position.col - 1) % 5 === 0 ? "2px" : "1px",
      borderTopWidth: (position.row - 1) % 5 === 0 ? "2px" : "1px",
      textAlign: "center",
      position: "relative",
      opacity: completed ? 0.4 : 1,
    }}
  >
    {stitch.type === "k2tog" && (
      <div
        style={{
          position: "absolute",
          top: "14%",
          left: "15%",
          width: "100%",
          height: "100%",
          borderTop: "1px solid grey",
          transform: "rotate(45deg)",
          transformOrigin: "-0.5px 0",
        }}
      />
    )}
    {stitch.type === "k3tog" && (
      <React.Fragment>
        <div
          style={{
            position: "absolute",
            left: "calc(-50% - 0.5px)",
            top: "calc(10%)",
            width: "100%",
            height: "85%",
            borderRight: "1px solid grey",
            transformOrigin: "top right",
            transform: "rotate(20deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "calc(-50% - 0.5px)",
            top: "calc(10%)",
            width: "100%",
            height: "80%",
            borderRight: "1px solid grey",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "calc(-50% - 0.5px)",
            top: "calc(10%)",
            width: "100%",
            height: "85%",
            borderRight: "1px solid grey",
            transformOrigin: "top right",
            transform: "rotate(-20deg)",
          }}
        />
      </React.Fragment>
    )}
    {stitch.starInfo?.connectedStars.size > 0 && (
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "4px",
          height: "4px",
          backgroundColor: "white",
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
    )}
  </div>
);

function constructConnections(stitches: Stitch[]): [number, number][] {
  const deduplicated = new Set(
    stitches.flatMap((stitch) =>
      stitch?.starInfo?.connectedStars
        ? Array.from(stitch.starInfo.connectedStars).flatMap((d) =>
            d[1].map((e) => JSON.stringify([stitch.id, e].sort()))
          )
        : []
    )
  );
  return Array.from(deduplicated).map(
    (item) => JSON.parse(item) as [number, number]
  );
}

const KnittingPattern: React.FC<KnittingPatternProps> = ({
  stitches,
  progress,
}) => {
  const stitchPositions: { [id: number]: StitchPosition } = {};
  const filteredStitches = stitches.filter((stitch) => stitch.id !== 0);
  const connections = constructConnections(filteredStitches);
  filteredStitches.forEach((stitch, index) => {
    if (index === 0) {
      stitchPositions[stitch.id] = { row: 0, col: 0 };
      return;
    }

    const linksToConsider = stitch.links.filter((id) => id !== 0).slice(0, -1);

    if (linksToConsider.length === 0) {
      const linkedStitchPos =
        stitchPositions[stitch.links[stitch.links.length - 1]];
      stitchPositions[stitch.id] = {
        row: linkedStitchPos.row,
        col: linkedStitchPos.col - 1,
      };
    } else {
      const middleIndex = Math.floor(linksToConsider.length / 2);
      const middleLink = linksToConsider[middleIndex];
      const middleLinkPos = stitchPositions[middleLink];
      stitchPositions[stitch.id] = {
        row: middleLinkPos.row - 1,
        col: middleLinkPos.col,
      };
    }
  });

  filteredStitches.forEach((stitch) => {
    stitch.starInfo.connectedStars.forEach((connectedStar, key) => {
      console.log(
        `Stitch ${stitch.id} connected to ${connectedStar} at ${key}`
      );
    });
  });

  const { minRow, minCol } = Object.values(stitchPositions).reduce(
    (acc, pos) => {
      acc.minRow = Math.min(acc.minRow, pos.row);
      acc.minCol = Math.min(acc.minCol, pos.col);
      return acc;
    },
    { minRow: Infinity, minCol: Infinity }
  );

  const numRows = 1 - minRow;
  const numCols = 1 - minCol;

  return (
    <div>
      <div
        id="printable-section"
        style={{
          display: "grid",
          gridTemplateRows: `repeat(${numRows + 1}, 10px)`,
          gridTemplateColumns: `repeat(${numCols + 1}, 10px)`,
          gap: "0px",
          minHeight: `${(numRows + 2) * 10}px`,
          overflowX: "auto",
          overflowY: "hidden",
          marginBottom: "10px",
          position: "relative",
        }}
      >
        {filteredStitches.map((stitch) => {
          const position = stitchPositions[stitch.id];
          return (
            <StitchBox
              key={`box-${stitch.id}`}
              stitch={stitch}
              position={position}
              numRows={numRows}
              numCols={numCols}
              completed={stitch.id <= progress}
            />
          );
        })}
        {[...Array(numCols)].map((_, colIndex) => {
          if ((colIndex + 1) % 5 === 0) {
            return (
              <LabelBottom
                key={`col-label-${colIndex}`}
                row={numRows + 1}
                col={numCols - colIndex}
              >
                {colIndex + 1}
              </LabelBottom>
            );
          }
        })}
        {[...Array(numRows)].map((_, rowIndex) => {
          if ((rowIndex + 1) % 5 === 0) {
            return (
              <LabelRight
                key={`col-label-${rowIndex}`}
                col={numCols + 1}
                row={numRows - rowIndex}
              >
                {rowIndex + 1}
              </LabelRight>
            );
          }
        })}
        {connections.map(([id1, id2]) => {
          console.log(id1, id2);
          const isPhantom = id1 <= 0;
          const pos1 = isPhantom ? stitchPositions[-id1] : stitchPositions[id1];
          const pos2 = stitchPositions[id2];
          if (!pos1 || !pos2) return null;

          let x1 = (numCols + pos1.col - 1) * 10 + 5;
          const y1 = isPhantom
            ? (numRows - pos1.row) * 10 + 5
            : (numRows + pos1.row - 1) * 10 + 5;

          let x2 = (numCols + pos2.col - 1) * 10 + 5;
          const y2 = (numRows + pos2.row - 1) * 10 + 5;

          const totalWidth = (numCols + 1) * 10;
          const halfWidth = totalWidth / 2;

          if (Math.abs(x2 - x1) > halfWidth) {
            if (x1 < x2) {
              x1 += totalWidth;
            } else {
              x2 += totalWidth;
            }
          }

          return (
            <svg
              key={`connection-${id1}-${id2}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${(numCols + 1) * 10}px`,
                height: `${(numRows + 1) * 10}px`,
                pointerEvents: "none",
              }}
            >
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="lightblue"
                strokeWidth="1"
              />

              <line
                x1={x1 - totalWidth}
                y1={y1}
                x2={x2 - totalWidth}
                y2={y2}
                stroke="lightblue"
                strokeWidth="1"
              />
            </svg>
          );
        })}
      </div>
    </div>
  );
};

export default KnittingPattern;
