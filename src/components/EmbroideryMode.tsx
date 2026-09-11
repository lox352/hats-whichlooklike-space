import React, { useMemo } from "react";
import { Stitch } from "../types/Stitch";
import { EmbroideryProgress } from "../types/SkyMarks";
import {
  SewingGroup,
  completedSegments,
  markSegment,
  selectedGroup,
  selectedSegment,
} from "../helpers/embroidery";
import { indexRows } from "../helpers/knitting-progress";
import ProgressRing from "./ProgressRing";
import "./KnittingMode.css";
import "./EmbroideryMode.css";

interface EmbroideryModeProps {
  groups: SewingGroup[];
  stitches: Stitch[];
  progress: EmbroideryProgress;
  onChange: (next: EmbroideryProgress, record?: boolean) => void;
  onStop: () => void;
  onUndo: () => void;
  canUndo: boolean;
}

/**
 * The panel you use with a needle in your hand.
 *
 * Built on the knitting panel's bones - same sticky footer, same big
 * targets, same shape - because it is the same instrument for the second
 * half of the make. Where the knitting panel says "knit 22 in Night", this
 * says "from row 28 stitch 11 to row 32 stitch 8": the vector you sew, in
 * the chart's own coordinates, since a percentage is no use to a needle.
 */
const EmbroideryMode: React.FC<EmbroideryModeProps> = ({
  groups,
  stitches,
  progress,
  onChange,
  onStop,
  onUndo,
  canUndo,
}) => {
  const rows = useMemo(() => indexRows(stitches), [stitches]);
  const done = completedSegments(groups, progress);
  const group = selectedGroup(groups, progress);
  const segment = selectedSegment(groups, progress);

  const address = (id: number) => {
    const row = rows.rowOf.get(id) ?? 1;
    const stitch = (rows.rows[row - 1]?.indexOf(id) ?? 0) + 1;
    return { row, stitch };
  };

  const total = groups.reduce((n, g) => n + g.segments.length, 0);
  const sewn = done.size;

  const choose = (abbreviation: string, segmentKey?: string) =>
    onChange({ ...progress, current: abbreviation, segment: segmentKey }, false);

  if (!group) {
    return (
      <div className="knitting-panel work-panel screen-only" role="region" aria-label="Embroidery">
        <p className="knitting-finished">
          Nothing on this hat to sew: the only figures on it run off the brim.
        </p>
        <div className="knitting-secondary">
          <button type="button" className="knitting-button" onClick={onStop}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const groupSewn = group.segments.filter((s) => done.has(s.key)).length;
  const nextGroup = groups.find(
    (g) => g.abbreviation !== group.abbreviation && g.segments.some((s) => !done.has(s.key))
  );
  const segmentIndex = segment ? group.segments.findIndex((s) => s.key === segment.key) : -1;

  return (
    <div className="knitting-panel work-panel screen-only" role="region" aria-label="Embroidery">
      <div className="knitting-progress-bar" aria-hidden="true">
        <div
          className="knitting-progress-fill"
          style={{ width: `${total ? (100 * sewn) / total : 0}%` }}
        />
      </div>

      <div className="knitting-where">
        <span>
          <span className="knitting-label">Figure</span>
          <b>{groups.indexOf(group) + 1}</b>
          <span> / {groups.length}</span>
        </span>
        <span>
          <span className="knitting-label">Line</span>
          <b>{segmentIndex >= 0 ? segmentIndex + 1 : group.segments.length}</b>
          <span> / {group.segments.length}</span>
        </span>
        <span>
          <span className="knitting-label">Left</span>
          <b>{total - sewn}</b>
        </span>
      </div>

      <label className="embroidery-picker">
        <span className="knitting-label">Constellation</span>
        <select value={group.abbreviation} onChange={(e) => choose(e.target.value)}>
          {groups.map((g) => (
            <option key={g.abbreviation} value={g.abbreviation}>
              {g.name} · {g.segments.filter((s) => done.has(s.key)).length}/{g.segments.length}
            </option>
          ))}
        </select>
      </label>

      {segment ? (
        <>
          <div className="knitting-run" aria-live="polite">
            <ProgressRing
              percent={(100 * groupSewn) / group.segments.length}
              label={`${group.name}: ${groupSewn} of ${group.segments.length} lines sewn`}
            />
            <span className="knitting-run-text embroidery-run">
              <b className="embroidery-figure">{group.name}</b>
              <span>
                from row <b>{address(segment.from).row}</b>, stitch{" "}
                <b>{address(segment.from).stitch}</b> to row{" "}
                <b>{address(segment.to).row}</b>, stitch <b>{address(segment.to).stitch}</b>
              </span>
            </span>
          </div>

          <div className="knitting-primary">
            <button
              type="button"
              className="knitting-button knitting-button-primary"
              onClick={() =>
                onChange(markSegment(groups, progress, segment.key, !done.has(segment.key)), true)
              }
            >
              {done.has(segment.key) ? "Unpick this line" : "Line sewn"}
            </button>
            <button
              type="button"
              className="knitting-button knitting-button-run"
              disabled={segmentIndex >= group.segments.length - 1}
              onClick={() => choose(group.abbreviation, group.segments[segmentIndex + 1]?.key)}
            >
              Skip to the next line
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="knitting-finished" aria-live="polite">
            {group.name} is sewn.
            {nextGroup ? "" : " That is every constellation on this hat."}
          </p>
          <div className="knitting-primary">
            {nextGroup ? (
              <button
                type="button"
                className="knitting-button knitting-button-primary"
                onClick={() => choose(nextGroup.abbreviation)}
              >
                Next: {nextGroup.name}
              </button>
            ) : (
              <button type="button" className="knitting-button knitting-button-primary" onClick={onStop}>
                Done
              </button>
            )}
            <button
              type="button"
              className="knitting-button knitting-button-run"
              onClick={() => choose(group.abbreviation, group.segments[0].key)}
            >
              Look back over it
            </button>
          </div>
        </>
      )}

      <div className="knitting-secondary">
        <button type="button" className="knitting-button" onClick={onUndo} disabled={!canUndo}>
          Undo
        </button>
        <button
          type="button"
          className="knitting-button"
          disabled={segmentIndex <= 0}
          onClick={() => choose(group.abbreviation, group.segments[segmentIndex - 1]?.key)}
        >
          Back one
        </button>
        <button type="button" className="knitting-button" onClick={onStop}>
          Stop
        </button>
      </div>

      <p className="knitting-hint">
        Small backstitches from star to star, with the fabric relaxed. Stitch
        numbers count from the right of each row, as on the chart.
        {group.offHatCount > 0 &&
          ` ${group.offHatCount === 1 ? "One line of this figure runs" : `${group.offHatCount} lines of this figure run`} off the brim and ${group.offHatCount === 1 ? "is" : "are"} left unsewn.`}
      </p>

      <details className="embroidery-index">
        <summary>Every constellation</summary>
        <div className="embroidery-index-list">
          {groups.map((g) => {
            const count = g.segments.filter((s) => done.has(s.key)).length;
            return (
              <button
                key={g.abbreviation}
                type="button"
                className="embroidery-index-item"
                aria-pressed={g.abbreviation === group.abbreviation}
                onClick={() => choose(g.abbreviation)}
              >
                <ProgressRing
                  percent={(100 * count) / g.segments.length}
                  label={`${g.name}, ${count} of ${g.segments.length} sewn`}
                />
                <span>{g.name}</span>
              </button>
            );
          })}
        </div>
      </details>
    </div>
  );
};

export default EmbroideryMode;
