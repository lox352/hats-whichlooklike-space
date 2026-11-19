import React from "react";
import type { EmbroideryProgress } from "../types/SkyMarks";
import {
  type SewingGroup,
  completedSegments,
  markSegment,
  selectedGroup,
  selectedSegment,
} from "../helpers/embroidery";
import type { HatReading } from "../knitting/useHatKnitting";
import Button from "./ui/Button";
import "./EmbroideryPanel.css";

interface EmbroideryPanelProps {
  groups: SewingGroup[];
  reading: HatReading;
  progress: EmbroideryProgress;
  onChange: (next: EmbroideryProgress, record?: boolean) => void;
  onStop: () => void;
  onUndo: () => void;
  canUndo: boolean;
}

const Undo: React.FC<{ onUndo: () => void; canUndo: boolean }> = ({ onUndo, canUndo }) => (
  <Button variant="quiet" className="knitting-undo" onClick={onUndo} disabled={!canUndo}>
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M5.5 3.5L2.5 6.5l3 3M2.5 6.5h7a4 4 0 0 1 0 8H7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    Undo
  </Button>
);

/**
 * The panel you use with a needle in your hand, once the sky is knitted.
 *
 * Built as the knitting panel is - the bar of how far along its top, what to
 * do in large type, the one thing to do in the big button - because it is the
 * same instrument for the second half of the make. Where the knitting panel
 * says "Knit 22 in Night", this says which star to which: from round 28,
 * stitch 11 to round 32, stitch 8, counted as the chart counts them, and the
 * chart above picks the line out and goes to it.
 */
const EmbroideryPanel: React.FC<EmbroideryPanelProps> = ({
  groups,
  reading,
  progress,
  onChange,
  onStop,
  onUndo,
  canUndo,
}) => {
  const { knitting, index } = reading;
  const done = completedSegments(groups, progress);
  const group = selectedGroup(groups, progress);
  const segment = selectedSegment(groups, progress);
  const total = groups.reduce((n, g) => n + g.segments.length, 0);
  const sewn = done.size;

  /** Where a star is, by the hat's own id: its round, and the stitch within it, as the chart counts them. */
  const address = (hatId: number) => {
    const id = knitting.idOfHat(hatId);
    const round = index.roundOf.get(id) ?? 1;
    const stitch = (index.rounds[round - 1]?.indexOf(id) ?? 0) + 1;
    return { round, stitch };
  };
  const choose = (abbreviation: string, segmentKey?: string) =>
    onChange({ ...progress, current: abbreviation, segment: segmentKey }, false);

  const close = (
    <button type="button" className="knitting-close" onClick={onStop} aria-label="Stop sewing" title="Stop sewing">
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M4.5 7.5l5.5 5.5 5.5-5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  if (!group) {
    return (
      <div className="knitting-panel embroidery-panel" role="region" aria-label="Embroidery">
        {close}
        <div className="knitting-done">
          <strong>Nothing on this hat to sew.</strong>
          <span className="quiet">The only figures on it run off the brim.</span>
        </div>
        <div className="knitting-done-actions">
          <Button variant="primary" onClick={onStop}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  const groupSewn = group.segments.filter((s) => done.has(s.key)).length;
  const nextGroup = groups.find(
    (g) => g.abbreviation !== group.abbreviation && g.segments.some((s) => !done.has(s.key)),
  );
  const at = segment ? group.segments.findIndex((s) => s.key === segment.key) : -1;
  const from = segment && address(segment.from);
  const to = segment && address(segment.to);

  return (
    <div className="knitting-panel embroidery-panel" role="region" aria-label="Embroidery">
      <div className="knitting-bar" aria-hidden="true">
        <span style={{ width: `${total ? (100 * sewn) / total : 0}%` }} />
      </div>
      {close}
      <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {segment && from && to
          ? `${group.name}, line ${at + 1} of ${group.segments.length}: from round ${from.round}, stitch ${from.stitch} to round ${to.round}, stitch ${to.stitch}.`
          : `${group.name} is sewn.`}
      </p>
      <div className="knitting-readout">
        <span className="knitting-figure">
          <em className="embroidery-name">{group.name}</em>
          <span className="quiet">
            {groupSewn} of {group.segments.length} lines sewn · figure {groups.indexOf(group) + 1} of {groups.length}
          </span>
        </span>
        <span className="knitting-figure">
          <em>{total - sewn}</em>
          <span className="quiet">lines left on the hat</span>
        </span>
      </div>

      {segment && from && to ? (
        <p className="embroidery-line">
          <span className="quiet">Line {at + 1}: </span>
          from <strong>round {from.round}, stitch {from.stitch}</strong> to{" "}
          <strong>
            round {to.round}, stitch {to.stitch}
          </strong>
        </p>
      ) : (
        <p className="embroidery-line">
          <strong>{group.name} is sewn.</strong>{" "}
          <span className="quiet">{nextGroup ? `Next, ${nextGroup.name}.` : "That is every constellation on this hat."}</span>
        </p>
      )}

      <div className="embroidery-tools">
        <label className="embroidery-picker">
          <span className="visually-hidden">Constellation</span>
          <select value={group.abbreviation} onChange={(e) => choose(e.target.value)}>
            {groups.map((g) => (
              <option key={g.abbreviation} value={g.abbreviation}>
                {g.name} · {g.segments.filter((s) => done.has(s.key)).length}/{g.segments.length}
              </option>
            ))}
          </select>
        </label>
        <p className="quiet embroidery-hint">
          Small backstitches from star to star, with the fabric relaxed.
          {group.offHatCount > 0 &&
            ` ${group.offHatCount === 1 ? "One line of this figure runs" : `${group.offHatCount} lines of this figure run`} off the brim, dashed on the chart, and ${group.offHatCount === 1 ? "is" : "are"} left unsewn.`}
        </p>
      </div>

      <div className="knitting-actions">
        <Undo onUndo={onUndo} canUndo={canUndo} />
        {segment ? (
          <>
            <Button
              variant="secondary"
              className="knitting-key"
              disabled={at <= 0}
              onClick={() => choose(group.abbreviation, group.segments[at - 1]?.key)}
            >
              Back one
            </Button>
            <Button
              variant="secondary"
              className="knitting-round"
              disabled={at >= group.segments.length - 1}
              onClick={() => choose(group.abbreviation, group.segments[at + 1]?.key)}
            >
              Skip
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="knitting-go"
              onClick={() => onChange(markSegment(groups, progress, segment.key, !done.has(segment.key)), true)}
            >
              {done.has(segment.key) ? "Unpick this line" : "Line sewn"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" className="knitting-round" onClick={() => choose(group.abbreviation, group.segments[0].key)}>
              Look back over it
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="knitting-go"
              onClick={() => (nextGroup ? choose(nextGroup.abbreviation) : onStop())}
            >
              {nextGroup ? `Next: ${nextGroup.name}` : "Done"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default EmbroideryPanel;
