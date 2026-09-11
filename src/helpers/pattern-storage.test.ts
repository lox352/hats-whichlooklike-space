import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bareIdFor,
  clampProgress,
  createPattern,
  deletePattern,
  listPatterns,
  percentComplete,
  readPattern,
  renamePattern,
  setProgress,
  storageKeyFor,
} from "./pattern-storage";
import { currentPatternVersion } from "../types/SavedPattern";
import { Stitch } from "../types/Stitch";
import { emptySky, noEmbroidery } from "../types/SkyMarks";
import { SkyPalette, yarnFor } from "./sky-palette";
import v1Fixture from "./__fixtures__/space-v1-pattern.json";

const stitch = (id: number, links: number[] = []): Stitch => ({
  id,
  position: { x: id, y: id, z: 0 },
  links,
  fixed: id === 0,
  type: "k1",
  colour: [1, 2, 3],
});

const stitches = (count: number) =>
  Array.from({ length: count }, (_, i) => stitch(i, i === 0 ? [] : [i - 1]));

beforeEach(() => {
  localStorage.clear();
});

describe("key helpers", () => {
  it("adds the prefix once and strips it once", () => {
    expect(storageKeyFor("123")).toBe("pattern-123");
    expect(storageKeyFor("pattern-123")).toBe("pattern-123");
    expect(bareIdFor("pattern-123")).toBe("123");
    expect(bareIdFor("123")).toBe("123");
  });
});

describe("clampProgress", () => {
  it("keeps progress inside the pattern", () => {
    expect(clampProgress(-5, 10)).toBe(0);
    expect(clampProgress(0, 10)).toBe(0);
    expect(clampProgress(5, 10)).toBe(5);
    // Progress is a stitch id, so the last valid value is count - 1.
    expect(clampProgress(10, 10)).toBe(9);
    expect(clampProgress(9999, 10)).toBe(9);
  });

  it("survives nonsense", () => {
    expect(clampProgress(NaN, 10)).toBe(0);
    expect(clampProgress(Infinity, 10)).toBe(9);
    expect(clampProgress(3.7, 10)).toBe(4);
    expect(clampProgress(5, 0)).toBe(0);
  });
});

describe("percentComplete", () => {
  it("does not divide by zero for an empty pattern", () => {
    expect(
      percentComplete({
        version: currentPatternVersion,
        id: "pattern-1",
        savedAt: new Date(0).toISOString(),
        stitches: [],
        sky: emptySky(),
        progress: 0,
        embroidery: noEmbroidery(),
      })
    ).toBe(0);
  });
});

describe("round trip", () => {
  it("saves and reads back a pattern", () => {
    const { result, pattern } = createPattern(stitches(5), emptySky(), "Wellington");
    expect(result.ok).toBe(true);

    const read = readPattern(pattern.id);
    expect(read?.name).toBe("Wellington");
    expect(read?.stitches).toHaveLength(5);
    expect(read?.version).toBe(currentPatternVersion);
    expect(Number.isNaN(Date.parse(read!.savedAt))).toBe(false);
  });

  it("treats an empty name as no name", () => {
    const { pattern } = createPattern(stitches(3), emptySky(), "");
    expect(readPattern(pattern.id)?.name).toBeUndefined();
  });

  it("renames without touching the stitches or progress", () => {
    const { pattern } = createPattern(stitches(6), emptySky(), "Before");
    setProgress(pattern.id, 3);
    renamePattern(pattern.id, "After");

    const read = readPattern(pattern.id);
    expect(read?.name).toBe("After");
    expect(read?.progress).toBe(3);
    expect(read?.stitches).toHaveLength(6);
  });

  it("clamps progress on write", () => {
    const { pattern } = createPattern(stitches(6), emptySky(), "P");
    setProgress(pattern.id, 999);
    expect(readPattern(pattern.id)?.progress).toBe(5);
    setProgress(pattern.id, -20);
    expect(readPattern(pattern.id)?.progress).toBe(0);
  });

  it("deletes", () => {
    const { pattern } = createPattern(stitches(3), emptySky(), "Doomed");
    deletePattern(pattern.id);
    expect(readPattern(pattern.id)).toBeUndefined();
  });

  it("notifies listeners on write and delete", () => {
    const listener = vi.fn();
    window.addEventListener("storageUpdated", listener);
    const { pattern } = createPattern(stitches(3), emptySky(), "P");
    expect(listener).toHaveBeenCalledTimes(1);
    deletePattern(pattern.id);
    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener("storageUpdated", listener);
  });
});

describe("listPatterns", () => {
  it("returns newest first", () => {
    localStorage.setItem(
      "pattern-1000",
      JSON.stringify({
        version: currentPatternVersion,
        id: "pattern-1000",
        name: "Oldest",
        savedAt: new Date(1000).toISOString(),
        stitches: stitches(2),
        progress: 0,
      })
    );
    localStorage.setItem(
      "pattern-3000",
      JSON.stringify({
        version: currentPatternVersion,
        id: "pattern-3000",
        name: "Newest",
        savedAt: new Date(3000).toISOString(),
        stitches: stitches(2),
        progress: 0,
      })
    );
    localStorage.setItem(
      "pattern-2000",
      JSON.stringify({
        version: currentPatternVersion,
        id: "pattern-2000",
        name: "Middle",
        savedAt: new Date(2000).toISOString(),
        stitches: stitches(2),
        progress: 0,
      })
    );

    expect(listPatterns().map((p) => p.name)).toEqual([
      "Newest",
      "Middle",
      "Oldest",
    ]);
  });

  it("ignores keys that are not patterns", () => {
    localStorage.setItem("something-else", "not json at all");
    const { pattern } = createPattern(stitches(2), emptySky(), "Mine");
    expect(listPatterns().map((p) => p.id)).toEqual([pattern.id]);
  });

  // The bug this exists to prevent: one bad entry used to throw out of a
  // useState initialiser and white-screen the homepage with no way back.
  it("skips a corrupt entry instead of throwing", () => {
    localStorage.setItem("pattern-500", "{ this is not json");
    localStorage.setItem("pattern-501", JSON.stringify({ nope: true }));
    localStorage.setItem("pattern-502", "null");
    const { pattern } = createPattern(stitches(2), emptySky(), "Good");

    const listed = listPatterns();
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(pattern.id);
  });

  it("skips an entry whose stitches are missing or malformed", () => {
    localStorage.setItem(
      "pattern-600",
      JSON.stringify({ id: "pattern-600", stitches: [], progress: 0 })
    );
    localStorage.setItem(
      "pattern-601",
      JSON.stringify({ id: "pattern-601", stitches: [{ nope: 1 }], progress: 0 })
    );
    expect(listPatterns()).toHaveLength(0);
  });
});

describe("migration from version 1", () => {
  /**
   * Exactly what the previous build wrote: no version, savedAt as a Date,
   * and every stitch as a JSON string carrying a starInfo of its own.
   */
  const legacyStitches = (count: number) =>
    stitches(count).map((stitch) =>
      JSON.stringify({ ...stitch, starInfo: { connectedStars: {} } })
    );
  const writeLegacy = (
    key: string,
    overrides: Record<string, unknown> = {}
  ) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        id: key,
        name: "Legacy hat",
        savedAt: new Date(1700000000000),
        stitches: legacyStitches(8),
        progress: 4,
        ...overrides,
      })
    );
  };

  it("reads a version 1 entry and stamps the current version", () => {
    writeLegacy("pattern-1700000000000");
    const read = readPattern("pattern-1700000000000");
    expect(read).toBeDefined();
    expect(read?.version).toBe(currentPatternVersion);
    expect(read?.name).toBe("Legacy hat");
    expect(read?.progress).toBe(4);
    expect(read?.stitches).toHaveLength(8);
  });

  it("turns the serialised Date into an ISO string", () => {
    writeLegacy("pattern-1700000000000");
    const read = readPattern("pattern-1700000000000");
    expect(typeof read?.savedAt).toBe("string");
    expect(new Date(read!.savedAt).getTime()).toBe(1700000000000);
  });

  // Older builds wrote null here when a rename prompt was cancelled.
  it("treats a null name from the old rename bug as no name", () => {
    writeLegacy("pattern-1700000000001", { name: null });
    expect(readPattern("pattern-1700000000001")?.name).toBeUndefined();
  });

  it("recovers savedAt from the key when it is missing or unparseable", () => {
    writeLegacy("pattern-1700000000002", { savedAt: undefined });
    expect(new Date(readPattern("pattern-1700000000002")!.savedAt).getTime()).toBe(
      1700000000002
    );

    writeLegacy("pattern-1700000000003", { savedAt: "not a date" });
    expect(new Date(readPattern("pattern-1700000000003")!.savedAt).getTime()).toBe(
      1700000000003
    );
  });

  it("clamps a legacy progress that ran past the end of the pattern", () => {
    writeLegacy("pattern-1700000000004", { progress: 99999 });
    expect(readPattern("pattern-1700000000004")?.progress).toBe(7);
  });

  it("repairs a legacy progress of NaN (serialised as null)", () => {
    writeLegacy("pattern-1700000000005", { progress: NaN });
    expect(readPattern("pattern-1700000000005")?.progress).toBe(0);
  });

  it("does not downgrade an entry written by a newer build", () => {
    // A newer build writes plain stitches, whatever else it adds.
    writeLegacy("pattern-1700000000006", { version: 99, stitches: stitches(8) });
    expect(readPattern("pattern-1700000000006")?.version).toBe(99);
  });
});

/*
 * The migration against the real thing: a version 1 entry captured from the
 * live site's localStorage before any of this work, trimmed to 64 stitches
 * with its constellation links kept closed over the subset.
 */
describe("migration of a captured version 1 pattern", () => {
  const key = v1Fixture.id;
  beforeEach(() => {
    localStorage.setItem(key, JSON.stringify(v1Fixture));
  });

  it("opens, and comes out at the current version", () => {
    const read = readPattern(key);
    expect(read).toBeDefined();
    expect(read!.version).toBe(currentPatternVersion);
    expect(read!.name).toBe(v1Fixture.name);
    expect(read!.progress).toBe(v1Fixture.progress);
    expect(read!.savedAt).toBe(new Date(v1Fixture.savedAt).toISOString());
  });

  it("turns every stringified stitch into a plain one, without its starInfo", () => {
    const read = readPattern(key)!;
    expect(read.stitches).toHaveLength(v1Fixture.stitches.length);
    for (const stitch of read.stitches) {
      expect(typeof stitch).toBe("object");
      expect("starInfo" in stitch).toBe(false);
      expect(typeof stitch.id).toBe("number");
    }
  });

  it("maps the old computed colours onto the three yarns", () => {
    const read = readPattern(key)!;
    const yarns = new Set(read.stitches.map((stitch) => yarnFor(stitch.colour)));
    expect([...yarns].every((yarn) => yarn !== undefined)).toBe(true);
    // The fixture has white stars, blue-grey galaxy and near-black night.
    expect(yarns.has("Star")).toBe(true);
    expect(yarns.has("Night")).toBe(true);
  });

  it("lifts the constellation links into the sky, phantoms flagged", () => {
    const read = readPattern(key)!;
    const abbreviations = read.sky.constellations.map((c) => c.abbreviation);
    expect(abbreviations).toContain("Per");
    expect(abbreviations).toContain("Eri");
    const points = read.sky.constellations.flatMap((c) =>
      c.strokes.flatMap((stroke) => stroke.points)
    );
    // The fixture carries two links below the brim, stored as negative ids.
    expect(points.filter((point) => point.offHat)).toHaveLength(2);
    for (const point of points) expect(point.stitch).toBeGreaterThanOrEqual(0);
  });

  it("is faithful rather than corrective about unlit link ends", () => {
    /*
     * The old projection did not light a constellation vertex whose star was
     * fainter than the limit, so old patterns have links ending on night
     * stitches. The migration leaves them be: recolouring a hat someone may
     * be half way through knitting is not its job.
     */
    const read = readPattern(key)!;
    const ends = read.sky.constellations.flatMap((c) =>
      c.strokes.flatMap((s) => s.points.filter((p) => !p.offHat).map((p) => p.stitch))
    );
    const unlit = ends.filter((stitch) => !read.sky.stars.includes(stitch));
    expect(unlit.length).toBeGreaterThan(0);
  });

  it("records each on-hat link once, though the old shape stored it twice", () => {
    const read = readPattern(key)!;
    const keys = read.sky.constellations.flatMap((c) =>
      c.strokes.map((stroke) => {
        const [a, b] = stroke.points.map((p) => p.stitch).sort((x, y) => x - y);
        return `${c.abbreviation}:${a}-${b}`;
      })
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("starts with no embroidery done", () => {
    expect(readPattern(key)!.embroidery).toEqual({ done: [] });
  });

  it("survives a round trip through the new shape", () => {
    const first = readPattern(key)!;
    localStorage.setItem(key, JSON.stringify(first));
    const second = readPattern(key)!;
    expect(second).toEqual(first);
  });

  it("colours a star stitch as star yarn", () => {
    const read = readPattern(key)!;
    const starStitch = read.stitches.find((s) => read.sky.stars.includes(s.id))!;
    expect(starStitch.colour).toEqual(SkyPalette.Star);
  });
});

describe("quota", () => {
  it("reports a full quota instead of throwing", () => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
    try {
      const { result } = createPattern(stitches(3), emptySky(), "Too big");
      expect(result).toEqual({ ok: false, reason: "quota" });
    } finally {
      Storage.prototype.setItem = setItem;
    }
  });
});

describe("percentComplete", () => {
  const pattern = (stitchCount: number, progress: number) => ({
    version: currentPatternVersion,
    id: "pattern-1",
    savedAt: new Date(0).toISOString(),
    stitches: stitches(stitchCount),
    sky: emptySky(),
    progress,
    embroidery: noEmbroidery(),
  });

  // Stitch 0 is the phantom start of the helix and is never knitted, so a
  // finished hat has progress === length - 1 and must read 100%, not 99.99%.
  it("reads 100% when every knittable stitch is done", () => {
    expect(percentComplete(pattern(101, 100))).toBe(100);
  });

  it("reads 0% at the start", () => {
    expect(percentComplete(pattern(101, 0))).toBe(0);
  });

  it("reads 50% halfway", () => {
    expect(percentComplete(pattern(101, 50))).toBeCloseTo(50, 6);
  });

  it("never exceeds 100%", () => {
    expect(percentComplete(pattern(101, 99999))).toBe(100);
  });

  it("handles a single-stitch pattern without dividing by zero", () => {
    expect(percentComplete(pattern(1, 0))).toBe(0);
  });
});
