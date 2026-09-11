import { init } from "browser-geo-tz";
import source from "../data/timezone-source.json";

/*
 * Which time zones a point on the ground is in, from exact boundaries.
 *
 * The design page used to import a six-megabyte GeoJSON of every zone and
 * test the point against all of them on every keystroke. The boundaries are
 * still exact - the same OpenStreetMap data, via browser-geo-tz - but they
 * sit in public/timezones as quarter-megabyte pieces, and only the pieces
 * holding the place asked about are fetched, once, when the time fields are
 * first used. Nothing here runs until then, so the page's first paint pays
 * nothing for it.
 */
const base = `${import.meta.env.BASE_URL}timezones/${source.version}/`;
const chunks = new Map<number, Promise<ArrayBuffer>>();
const chunk = (number: number) => {
  let pending = chunks.get(number);
  if (!pending) {
    pending = fetch(`${base}${number}.dat`)
      .then((response) => {
        if (!response.ok)
          throw new Error(
            "Time-zone boundaries could not be loaded. Please retry.",
          );
        return response.arrayBuffer();
      })
      .catch((error) => {
        chunks.delete(number);
        throw error;
      });
    chunks.set(number, pending);
  }
  return pending;
};
/**
 * The bytes between two offsets of the boundary file, from whichever pieces
 * hold them. Pieces rather than an HTTP range request, because a static host
 * such as GitHub Pages does not honour ranges reliably.
 */
export async function boundaryRange(
  start: number,
  end: number,
): Promise<ArrayBuffer> {
  const first = Math.floor(start / source.chunkBytes);
  const last = Math.floor(end / source.chunkBytes);
  const pieces = await Promise.all(
    Array.from({ length: last - first + 1 }, (_, i) => chunk(first + i)),
  );
  const joined = new Uint8Array(pieces.reduce((n, p) => n + p.byteLength, 0));
  let offset = 0;
  for (const piece of pieces) {
    joined.set(new Uint8Array(piece), offset);
    offset += piece.byteLength;
  }
  return joined.slice(
    start - first * source.chunkBytes,
    end - first * source.chunkBytes + 1,
  ).buffer;
}
let index: Promise<unknown> | undefined;
const lookup = init(
  boundaryRange,
  () =>
    (index ??= fetch(`${base}index.json`)
      .then((response) => {
        if (!response.ok)
          throw new Error("Time-zone map could not be loaded. Please retry.");
        return response.json();
      })
      .catch((error) => {
        index = undefined;
        throw error;
      })),
);
/** The IANA zones at a latitude and longitude, most likely first. */
export const zonesAt = lookup.find;
