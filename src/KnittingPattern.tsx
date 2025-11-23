import React, { useMemo } from "react";
import { Stitch } from "./types/Stitch";
import { constructConnections } from "./helpers/connections";
import "./KnittingPattern.css";

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
    className="grid-label grid-label-right"
    id={`label-row-${row}-col-${col}`}
    style={{
      gridRow: row,
      gridColumn: col,
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
    className="grid-label grid-label-bottom"
    id={`label-row-${row}-col-${col}`}
    style={{
      gridRow: row,
      gridColumn: col,
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
}> = React.memo(({ stitch, position, numRows, numCols, completed }) => (
  <div
    className="stitch-box"
    key={`stitch-${stitch.id}-row-${position.row}-col-${position.col}`}
    id={`stitch-${stitch.id}-row-${position.row}-col-${position.col}`}
    style={{
      gridRow: numRows + position.row,
      gridColumn: numCols + position.col,
      backgroundColor: `rgb(${stitch.colour.join(",")})`,
      borderLeftWidth: (position.col - 1) % 5 === 0 ? "2px" : "1px",
      borderTopWidth: (position.row - 1) % 5 === 0 ? "2px" : "1px",
      opacity: completed ? 0.4 : 1,
    }}
  >
    {stitch.type === "k2tog" && <div className="stitch-decoration k2tog-line" />}
    {stitch.type === "k3tog" && (
      <React.Fragment>
        <div className="stitch-decoration k3tog-line-1" />
        <div className="stitch-decoration k3tog-line-2" />
        <div className="stitch-decoration k3tog-line-3" />
      </React.Fragment>
    )}
    {stitch.starInfo?.connectedStars.size > 0 && (
      <div className="star-dot" />
    )}
  </div>
));

const KnittingPattern: React.FC<KnittingPatternProps> = ({
  stitches,
  progress,
}) => {
  const filteredStitches = useMemo(
    () => stitches.filter((stitch) => stitch.id !== 0),
    [stitches]
  );

  const connections = useMemo(
    () => constructConnections(filteredStitches),
    [filteredStitches]
  );

  const stitchPositions = useMemo(() => {
    const positions: { [id: number]: StitchPosition } = {};
    filteredStitches.forEach((stitch, index) => {
      if (index === 0) {
        positions[stitch.id] = { row: 0, col: 0 };
        return;
      }

      const linksToConsider = stitch.links
        .filter((id) => id !== 0)
        .slice(0, -1);

      if (linksToConsider.length === 0) {
        const linkedStitchPos =
          positions[stitch.links[stitch.links.length - 1]];
        positions[stitch.id] = {
          row: linkedStitchPos.row,
          col: linkedStitchPos.col - 1,
        };
      } else {
        const middleIndex = Math.floor(linksToConsider.length / 2);
        const middleLink = linksToConsider[middleIndex];
        const middleLinkPos = positions[middleLink];
        positions[stitch.id] = {
          row: middleLinkPos.row - 1,
          col: middleLinkPos.col,
        };
      }
    });
    return positions;
  }, [filteredStitches]);

  const { numRows, numCols } = useMemo(() => {
    const { minRow, minCol } = Object.values(stitchPositions).reduce(
      (acc, pos) => {
        acc.minRow = Math.min(acc.minRow, pos.row);
        acc.minCol = Math.min(acc.minCol, pos.col);
        return acc;
      },
      { minRow: Infinity, minCol: Infinity }
    );
    return { numRows: 1 - minRow, numCols: 1 - minCol };
  }, [stitchPositions]);

  return (
    <div>
      <div
        id="printable-section"
        className="knitting-pattern-container"
        style={{
          gridTemplateRows: `repeat(${numRows + 1}, 10px)`,
          gridTemplateColumns: `repeat(${numCols + 1}, 10px)`,
          minHeight: `${(numRows + 2) * 10}px`,
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
          return null;
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
          return null;
        })}
        {connections.map(([id1, id2]) => {
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
              className="connection-svg"
              style={{
                width: `${numCols * 10}px`,
                height: `${numRows * 10}px`,
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
