import { Stitch } from "./Stitch";
import { EmbroideryProgress, SkyMarks } from "./SkyMarks";

/**
 * Version of the persisted pattern shape. Bump this whenever the stored fields
 * change, and add a migration step in helpers/pattern-storage.ts so patterns
 * saved by older builds keep working.
 *
 * 1 - original shape. `stitches` was an array of *strings*, each a stitch
 *     hand-stringified because it carried a `Map` of constellation links, and
 *     `savedAt` was written by JSON.stringify(new Date()), so it was always a
 *     string on the way back out despite being typed as a Date. No `version`
 *     field was recorded.
 * 2 - stitches are plain objects; the sky (stars and constellation strokes)
 *     lives beside them in `sky`; `savedAt` is typed honestly as an ISO
 *     string; embroidery progress is recorded; `version` is explicit.
 * 3 - `sky.regions` labels every stitch with its IAU constellation. Older
 *     entries are read as they are; they have no way of saying which sky
 *     they were pointed at, so they stay unlabelled.
 */
export const currentPatternVersion = 3;

export interface SavedPattern {
  version: number;
  /** Full localStorage key, e.g. "pattern-1736300000000". */
  id: string;
  name?: string;
  /** ISO 8601. JSON has no Date type, so this is deliberately not a Date. */
  savedAt: string;
  stitches: Stitch[];
  sky: SkyMarks;
  /** Id of the last stitch knitted. 0 means nothing knitted yet. */
  progress: number;
  embroidery: EmbroideryProgress;
}
