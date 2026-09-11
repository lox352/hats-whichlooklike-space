import { SkyMarks, EmbroideryProgress } from "../types/SkyMarks";
import { Stitch } from "../types/Stitch";
import { SavedPattern } from "../types/SavedPattern";
import { segmentsOf } from "./connections";
import { constellationName } from "../data/constellation-names";
export interface SewingSegment {
  key: string;
  abbreviation: string;
  strokeIndex: number;
  segmentIndex: number;
  from: number;
  to: number;
}
export interface SewingGroup {
  abbreviation: string;
  name: string;
  segments: SewingSegment[];
  offHatCount: number;
}
export const segmentKey = (s: {
  abbreviation: string;
  strokeIndex: number;
  segmentIndex: number;
}) => `${s.abbreviation}:${s.strokeIndex}:${s.segmentIndex}`;
/** Stable source identities; only the traversal direction changes when ordering. */
export function sewingGroups(sky: SkyMarks, stitches: Stitch[]): SewingGroup[] {
  const byId = new Map(stitches.filter((s) => s.id > 0).map((s) => [s.id, s]));
  const groups = new Map<string, SewingGroup>();
  const seen = new Set<string>();
  for (const s of segmentsOf(sky)) {
    let group = groups.get(s.abbreviation);
    if (!group) {
      group = {
        abbreviation: s.abbreviation,
        name: constellationName(s.abbreviation),
        segments: [],
        offHatCount: 0,
      };
      groups.set(s.abbreviation, group);
    }
    if (s.from.offHat || s.to.offHat) {
      group.offHatCount++;
      continue;
    }
    const from = s.from.stitch,
      to = s.to.stitch;
    if (from === to || !byId.has(from) || !byId.has(to)) continue;
    const edge = `${s.abbreviation}:${Math.min(from, to)}-${Math.max(from, to)}`;
    if (seen.has(edge)) continue;
    seen.add(edge);
    group.segments.push({
      key: segmentKey(s),
      abbreviation: s.abbreviation,
      strokeIndex: s.strokeIndex,
      segmentIndex: s.segmentIndex,
      from,
      to,
    });
  }
  const distance = (a: number, b: number) => {
    const p = byId.get(a)!.position,
      q = byId.get(b)!.position;
    return (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2;
  };
  for (const group of groups.values()) {
    const remaining = [...group.segments],
      ordered: SewingSegment[] = [];
    let endpoint: number | undefined;
    while (remaining.length) {
      let best = 0,
        reverse = false,
        bestDistance = Infinity;
      if (endpoint === undefined) {
        const degree = new Map<number, number>();
        for (const s of remaining)
          for (const id of [s.from, s.to])
            degree.set(id, (degree.get(id) ?? 0) + 1);
        const start = remaining.findIndex(
          (s) => degree.get(s.from) === 1 || degree.get(s.to) === 1,
        );
        if (start >= 0) {
          best = start;
          reverse =
            degree.get(remaining[start].to) === 1 &&
            degree.get(remaining[start].from) !== 1;
        }
      } else {
        const shared = remaining.findIndex(
          (s) => s.from === endpoint || s.to === endpoint,
        );
        if (shared >= 0) {
          best = shared;
          reverse = remaining[shared].to === endpoint;
        } else
          for (let i = 0; i < remaining.length; i++) {
            const s = remaining[i];
            for (const flip of [false, true]) {
              const d = distance(endpoint, flip ? s.to : s.from);
              if (d < bestDistance) {
                bestDistance = d;
                best = i;
                reverse = flip;
              }
            }
          }
      }
      const s = remaining.splice(best, 1)[0];
      const next = reverse ? { ...s, from: s.to, to: s.from } : s;
      ordered.push(next);
      endpoint = next.to;
    }
    group.segments = ordered;
  }
  return [...groups.values()]
    .filter((g) => g.segments.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}
/** Accept the earlier stroke-level draft shape, expanding it to segment keys. */
export function completedSegments(
  groups: SewingGroup[],
  progress: EmbroideryProgress,
): Set<string> {
  const raw = new Set(progress.done);
  return new Set(
    groups.flatMap((g) =>
      g.segments
        .filter(
          (s) =>
            raw.has(s.key) || raw.has(`${s.abbreviation}:${s.strokeIndex}`),
        )
        .map((s) => s.key),
    ),
  );
}
export function selectedGroup(
  groups: SewingGroup[],
  progress: EmbroideryProgress,
) {
  return (
    groups.find((g) => g.abbreviation === progress.current) ??
    groups.find((g) =>
      g.segments.some((s) => !completedSegments(groups, progress).has(s.key)),
    ) ??
    groups[0]
  );
}
export function selectedSegment(
  groups: SewingGroup[],
  progress: EmbroideryProgress,
) {
  const group = selectedGroup(groups, progress);
  const done = completedSegments(groups, progress);
  return (
    group?.segments.find((s) => s.key === progress.segment) ??
    group?.segments.find((s) => !done.has(s.key))
  );
}
export function markSegment(
  groups: SewingGroup[],
  progress: EmbroideryProgress,
  key: string,
  done: boolean,
): EmbroideryProgress {
  const complete = completedSegments(groups, progress);
  if (done) complete.add(key);
  else complete.delete(key);
  const group = groups.find((g) => g.segments.some((s) => s.key === key));
  if (!group) return progress;
  const next = group.segments.find((s) => !complete.has(s.key));
  return {
    done: [...complete],
    current: group.abbreviation,
    segment: done ? next?.key : key,
  };
}

/**
 * How much of the sewing is done, for the card on the home page. Counts
 * segments, since that is what gets ticked off, and reads 0 for a hat with
 * no figures on it rather than dividing by nothing.
 */
export function embroideryPercent(pattern: SavedPattern): number {
  const groups = sewingGroups(pattern.sky, pattern.stitches);
  const total = groups.reduce((sum, group) => sum + group.segments.length, 0);
  if (total === 0) return 0;
  const done = completedSegments(groups, pattern.embroidery).size;
  return Math.min((100 * done) / total, 100);
}
