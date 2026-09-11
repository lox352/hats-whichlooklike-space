import { currentPatternVersion, SavedPattern } from "../types/SavedPattern";
import { Stitch } from "../types/Stitch";
import { RGB } from "../types/RGB";
import {
  EmbroideryProgress,
  emptySky,
  noEmbroidery,
  SkyMarks,
  Stroke,
} from "../types/SkyMarks";
import { SkyPalette, yarnFor } from "./sky-palette";

/**
 * Every read and write of a saved pattern goes through this module.
 *
 * Two rules it exists to enforce:
 *  - a single unreadable entry must never take down the page that lists them, and
 *  - patterns written by an older build must keep opening, so reads migrate
 *    forward rather than rejecting anything unfamiliar.
 */

const keyPrefix = "pattern-";
// Reuse geometry across progress writes, so ticking a stitch or segment does
// not rebuild the chart, exports and constellation graph. Raw-string checks
// still detect edits from another tab or outside the application.
const patternCache = new Map<string, { raw: string; pattern: SavedPattern }>();

/*
 * Marks a pattern link as "open this straight into knitting mode".
 *
 * In the URL rather than in router state so that it survives a refresh: put
 * the phone down mid-row, come back to it, and you are still knitting.
 */
export const knittingParam = "knitting";

/** The same, for opening straight into the embroidery guide. */
export const embroideryParam = "embroidery";

/** Fired after any write, so open views can re-read. */
export const patternsChangedEvent = "storageUpdated";

export const storageKeyFor = (patternId: string) =>
  patternId.startsWith(keyPrefix) ? patternId : `${keyPrefix}${patternId}`;

/** The bare timestamp id, with the storage prefix stripped. */
export const bareIdFor = (patternId: string) =>
  patternId.replace(new RegExp(`^${keyPrefix}`), "");

export const notifyPatternsChanged = () =>
  window.dispatchEvent(new CustomEvent(patternsChangedEvent));

const isStitch = (value: unknown): value is Stitch => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Stitch>;
  return (
    typeof candidate.id === "number" &&
    Array.isArray(candidate.links) &&
    Array.isArray(candidate.colour) &&
    typeof candidate.position === "object" &&
    candidate.position !== null
  );
};

/**
 * Derive a timestamp from the storage key, which has always been
 * `pattern-${Date.now()}`. Used when `savedAt` is missing or unparseable.
 */
const savedAtFromId = (storageKey: string): string => {
  const timestamp = Number(bareIdFor(storageKey));
  return Number.isFinite(timestamp) && timestamp > 0
    ? new Date(timestamp).toISOString()
    : new Date(0).toISOString();
};

const normaliseSavedAt = (value: unknown, storageKey: string): string => {
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return savedAtFromId(storageKey);
};

/*
 * Version 1 stored each stitch as a JSON string, because the stitch carried
 * a Map of constellation links that JSON cannot hold. The links looked like
 *   starInfo.connectedStars: { Cru: [1234, -2345] }
 * keyed by constellation, listing the peer stitches, with a negative id for
 * a peer below the brim (the reflected stitch, in that build's encoding).
 * The colours were the old computed palette: near-black night, a graded
 * blue for the galaxy, and pure white stars.
 */
interface V1Stitch extends Stitch {
  starInfo?: { connectedStars?: Record<string, number[]> };
}

const nearestYarn = (colour: RGB): RGB => {
  let best = SkyPalette.Night;
  let bestDistance = Infinity;
  for (const yarn of Object.values(SkyPalette)) {
    const distance =
      (yarn[0] - colour[0]) ** 2 +
      (yarn[1] - colour[1]) ** 2 +
      (yarn[2] - colour[2]) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = yarn;
    }
  }
  return best;
};

/**
 * Lift a version 1 entry's stitches and sky out of its stringified stitches.
 * Every link becomes a two-point stroke; the original figures' polylines
 * were never stored, so they cannot be reassembled, and a stroke per link is
 * still something that can be sewn.
 */
const liftV1 = (
  stitchStrings: unknown[],
): { stitches: Stitch[]; sky: SkyMarks } => {
  const stitches: Stitch[] = [];
  const strokesByConstellation = new Map<string, Stroke[]>();
  const seenEdges = new Set<string>();

  for (const entry of stitchStrings) {
    if (typeof entry !== "string") continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(entry);
    } catch {
      continue;
    }
    if (!isStitch(parsed)) continue;
    const { starInfo, ...stitch } = parsed as V1Stitch;
    stitches.push({ ...stitch, colour: nearestYarn(stitch.colour) });

    for (const [abbreviation, peers] of Object.entries(
      starInfo?.connectedStars ?? {},
    )) {
      for (const peer of peers) {
        if (typeof peer !== "number") continue;
        const offHat = peer < 0;
        const target = Math.abs(peer);
        // An on-hat link is recorded on both ends; keep it once.
        const edgeKey = offHat
          ? `${abbreviation}:${stitch.id}>${target}`
          : `${abbreviation}:${Math.min(stitch.id, target)}-${Math.max(stitch.id, target)}`;
        if (seenEdges.has(edgeKey)) continue;
        seenEdges.add(edgeKey);
        const strokes = strokesByConstellation.get(abbreviation) ?? [];
        strokes.push({
          points: [
            { stitch: stitch.id, offHat: false },
            { stitch: target, offHat },
          ],
        });
        strokesByConstellation.set(abbreviation, strokes);
      }
    }
  }

  const stars = stitches
    .filter((stitch) => yarnFor(stitch.colour) === "Star")
    .map((stitch) => stitch.id);

  return {
    stitches,
    sky: {
      stars,
      constellations: [...strokesByConstellation.entries()].map(
        ([abbreviation, strokes]) => ({ abbreviation, strokes }),
      ),
    },
  };
};

const isSky = (value: unknown): value is SkyMarks => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<SkyMarks>;
  return (
    Array.isArray(candidate.stars) && Array.isArray(candidate.constellations)
  );
};

const isEmbroidery = (value: unknown): value is EmbroideryProgress => {
  if (typeof value !== "object" || value === null) return false;
  return Array.isArray((value as Partial<EmbroideryProgress>).done);
};

/**
 * Bring a raw parsed entry up to the current shape, or return undefined if it
 * is too damaged to be worth showing. Unknown future versions are passed
 * through rather than discarded, so a downgrade doesn't destroy data.
 */
const migrate = (
  raw: unknown,
  storageKey: string,
): SavedPattern | undefined => {
  if (typeof raw !== "object" || raw === null) return undefined;
  const candidate = raw as Record<string, unknown>;
  const version = typeof candidate.version === "number" ? candidate.version : 1;

  let stitches: Stitch[];
  let sky: SkyMarks;
  const rawStitches = Array.isArray(candidate.stitches)
    ? candidate.stitches
    : [];
  if (version < 2) {
    ({ stitches, sky } = liftV1(rawStitches));
  } else {
    stitches = rawStitches.filter(isStitch);
    sky = isSky(candidate.sky) ? candidate.sky : emptySky();
  }
  if (stitches.length === 0) return undefined;

  // `name` could be null here: a bug in earlier builds wrote null when a
  // rename prompt was cancelled. Treat that as "no name".
  const name =
    typeof candidate.name === "string" && candidate.name.length > 0
      ? candidate.name
      : undefined;

  const progress =
    typeof candidate.progress === "number" &&
    Number.isFinite(candidate.progress)
      ? clampProgress(candidate.progress, stitches.length)
      : 0;

  return {
    version: Math.max(version, currentPatternVersion),
    id: storageKey,
    name,
    savedAt: normaliseSavedAt(candidate.savedAt, storageKey),
    stitches,
    sky,
    progress,
    embroidery: isEmbroidery(candidate.embroidery)
      ? candidate.embroidery
      : noEmbroidery(),
  };
};

/**
 * Progress is a stitch id, so it is only meaningful within the pattern: the
 * last valid value is `stitchCount - 1`. NaN has no sensible clamp and becomes
 * 0; everything else, infinities included, clamps to the ends.
 */
export const clampProgress = (
  progress: number,
  stitchCount: number,
): number => {
  if (Number.isNaN(progress)) return 0;
  const highest = Math.max(stitchCount - 1, 0);
  return Math.min(Math.max(Math.round(progress), 0), highest);
};

/**
 * Stitch 0 is the phantom start of the helix and is never knitted, so the
 * number of knittable stitches is one less than the array length. Dividing by
 * the full length would cap a finished hat at 99.99%.
 */
export const knittableStitchCount = (pattern: SavedPattern): number =>
  Math.max(pattern.stitches.length - 1, 0);

export const percentComplete = (pattern: SavedPattern): number => {
  const knittable = knittableStitchCount(pattern);
  if (knittable === 0) return 0;
  return Math.min((100 * pattern.progress) / knittable, 100);
};

export const readPattern = (
  patternId: string | undefined,
): SavedPattern | undefined => {
  if (!patternId) return undefined;
  const storageKey = storageKeyFor(patternId);
  let stored: string | null;
  try {
    stored = localStorage.getItem(storageKey);
  } catch {
    return undefined;
  }
  if (!stored) {
    patternCache.delete(storageKey);
    return undefined;
  }
  const cached = patternCache.get(storageKey);
  if (cached?.raw === stored) return cached.pattern;
  try {
    const pattern = migrate(JSON.parse(stored), storageKey);
    if (pattern) patternCache.set(storageKey, { raw: stored, pattern });
    return pattern;
  } catch {
    return undefined;
  }
};

/** Newest first. Entries that cannot be read are skipped, not thrown. */
export const listPatterns = (): SavedPattern[] => {
  let keys: string[];
  try {
    keys = Object.keys(localStorage);
  } catch {
    return [];
  }
  return keys
    .filter((key) => key.startsWith(keyPrefix))
    .map((key) => readPattern(key))
    .filter((pattern): pattern is SavedPattern => pattern !== undefined)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
};

export type WriteResult =
  { ok: true } | { ok: false; reason: "quota" | "unavailable" };

const write = (pattern: SavedPattern): WriteResult => {
  try {
    const raw = JSON.stringify(pattern);
    localStorage.setItem(pattern.id, raw);
    patternCache.set(pattern.id, { raw, pattern });
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      return { ok: false, reason: "quota" };
    }
    return { ok: false, reason: "unavailable" };
  }
  notifyPatternsChanged();
  return { ok: true };
};

export const createPattern = (
  stitches: Stitch[],
  sky: SkyMarks,
  name: string | undefined,
): { result: WriteResult; pattern: SavedPattern } => {
  const now = new Date();
  const pattern: SavedPattern = {
    version: currentPatternVersion,
    id: storageKeyFor(now.getTime().toString()),
    name: name && name.length > 0 ? name : undefined,
    savedAt: now.toISOString(),
    stitches,
    sky,
    progress: 0,
    embroidery: noEmbroidery(),
  };
  return { result: write(pattern), pattern };
};

export const renamePattern = (
  patternId: string,
  name: string,
): WriteResult | undefined => {
  const pattern = readPattern(patternId);
  if (!pattern) return undefined;
  return write({ ...pattern, name: name.length > 0 ? name : undefined });
};

export const setProgress = (
  patternId: string,
  progress: number,
): WriteResult | undefined => {
  const pattern = readPattern(patternId);
  if (!pattern) return undefined;
  return write({
    ...pattern,
    progress: clampProgress(progress, pattern.stitches.length),
  });
};

export const setEmbroidery = (
  patternId: string,
  embroidery: EmbroideryProgress,
): WriteResult | undefined => {
  const pattern = readPattern(patternId);
  if (!pattern) return undefined;
  return write({ ...pattern, embroidery });
};

export const deletePattern = (patternId: string): void => {
  try {
    localStorage.removeItem(storageKeyFor(patternId));
    patternCache.delete(storageKeyFor(patternId));
  } catch {
    return;
  }
  notifyPatternsChanged();
};

/** Re-persist every readable entry in the current shape. */
export const migrateAllPatterns = (): void => {
  listPatterns().forEach((pattern) => write(pattern));
};
