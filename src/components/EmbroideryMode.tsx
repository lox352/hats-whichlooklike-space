import { useMemo } from "react";
import { Stitch } from "../types/Stitch";
import { EmbroideryProgress } from "../types/SkyMarks";
import {
  SewingGroup,
  completedSegments,
  selectedGroup,
  selectedSegment,
  markSegment,
} from "../helpers/embroidery";
import { indexRows } from "../helpers/knitting-progress";
import ProgressRing from "./ProgressRing";
import Button from "./ui/Button";
import "./EmbroideryMode.css";
interface Props {
  groups: SewingGroup[];
  stitches: Stitch[];
  progress: EmbroideryProgress;
  onChange: (next: EmbroideryProgress, record?: boolean) => void;
  onStop: () => void;
  onUndo: () => void;
  canUndo: boolean;
}
export default function EmbroideryMode({
  groups,
  stitches,
  progress,
  onChange,
  onStop,
  onUndo,
  canUndo,
}: Props) {
  const rows = useMemo(() => indexRows(stitches), [stitches]);
  const done = completedSegments(groups, progress),
    group = selectedGroup(groups, progress),
    segment = selectedSegment(groups, progress);
  const address = (id: number) => {
    const row = rows.rowOf.get(id) ?? 1;
    return `row ${row}, stitch ${(rows.rows[row - 1]?.indexOf(id) ?? 0) + 1}`;
  };
  const total = groups.reduce((n, g) => n + g.segments.length, 0);
  const complete = done.size;
  if (!group)
    return (
      <section className="embroidery-panel">
        <h2>No sewable segments on this hat</h2>
        <p>
          Lines beyond the brim are only guides. The stars can be left as
          knitted.
        </p>
        <Button onClick={onStop}>Close embroidery</Button>
      </section>
    );
  const groupDone = group.segments.filter((s) => done.has(s.key)).length;
  const nextGroup = groups.find(
    (g) =>
      g.abbreviation !== group.abbreviation &&
      g.segments.some((s) => !done.has(s.key)),
  );
  return (
    <section
      className="embroidery-panel screen-only"
      aria-label="Embroidery guide"
    >
      <div className="embroidery-heading">
        <span className="eyebrow">Trace the constellations</span>
        <span>
          {complete} / {total} segments sewn
        </span>
      </div>
      <label>
        Constellation
        <select
          value={group.abbreviation}
          onChange={(e) =>
            onChange({
              ...progress,
              current: e.target.value,
              segment: undefined,
            })
          }
        >
          {groups.map((g) => (
            <option key={g.abbreviation} value={g.abbreviation}>
              {g.name} · {g.segments.filter((s) => done.has(s.key)).length}/
              {g.segments.length}
            </option>
          ))}
        </select>
      </label>
      <div className="embroidery-current">
        <ProgressRing
          percent={(100 * groupDone) / group.segments.length}
          label={`${group.name}: ${groupDone} of ${group.segments.length} segments sewn`}
        />
        <h2>{group.name}</h2>
      </div>
      {segment ? (
        <>
          <label>
            Segment
            <select
              value={segment.key}
              onChange={(e) =>
                onChange({
                  ...progress,
                  current: group.abbreviation,
                  segment: e.target.value,
                })
              }
            >
              {group.segments.map((s, i) => (
                <option key={s.key} value={s.key}>
                  {i + 1} / {group.segments.length}
                  {done.has(s.key) ? " · sewn" : ""}
                </option>
              ))}
            </select>
          </label>
          <p className="embroidery-address" aria-live="polite">
            <span>
              From <strong>{address(segment.from)}</strong>
            </span>
            <span>
              To <strong>{address(segment.to)}</strong>
            </span>
          </p>
          <p className="embroidery-note">
            Use small backstitches between these stars, leaving the fabric
            relaxed. Read stitch numbers from the right of each chart row.
          </p>
          <Button
            variant="primary"
            onClick={() =>
              onChange(
                markSegment(
                  groups,
                  progress,
                  segment.key,
                  !done.has(segment.key),
                ),
                true,
              )
            }
          >
            {done.has(segment.key)
              ? "Mark this segment unsewn"
              : "Segment sewn"}
          </Button>
        </>
      ) : (
        <div aria-live="polite">
          <p className="embroidery-finished">{group.name} is complete.</p>
          <Button
            onClick={() =>
              onChange({
                ...progress,
                current: group.abbreviation,
                segment: group.segments[0].key,
              })
            }
          >
            Review sewn segments
          </Button>
          {nextGroup ? (
            <Button
              variant="primary"
              onClick={() =>
                onChange({
                  ...progress,
                  current: nextGroup.abbreviation,
                  segment: undefined,
                })
              }
            >
              Next: {nextGroup.name}
            </Button>
          ) : (
            <p>Every constellation on this hat is sewn.</p>
          )}
        </div>
      )}
      {group.offHatCount > 0 && (
        <p className="embroidery-note">
          {group.offHatCount} guide{group.offHatCount === 1 ? "" : "s"} continue
          beyond the brim and are omitted from sewing.
        </p>
      )}
      <div className="actions">
        <Button onClick={onUndo} disabled={!canUndo}>
          Undo sewing
        </Button>
        <Button variant="quiet" onClick={onStop}>
          Stop embroidery
        </Button>
      </div>
      <details>
        <summary>All constellations</summary>
        <div className="constellation-progress">
          {groups.map((g) => (
            <button
              key={g.abbreviation}
              aria-pressed={g.abbreviation === group.abbreviation}
              onClick={() =>
                onChange({
                  ...progress,
                  current: g.abbreviation,
                  segment: undefined,
                })
              }
            >
              <ProgressRing
                percent={
                  (100 * g.segments.filter((s) => done.has(s.key)).length) /
                  g.segments.length
                }
                label={`${g.name} embroidery progress`}
              />
              <span>{g.name}</span>
            </button>
          ))}
        </div>
      </details>
    </section>
  );
}
