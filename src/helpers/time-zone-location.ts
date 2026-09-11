import { init } from "browser-geo-tz";
import source from "../data/timezone-source.json";
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
// Fetch only the small pieces containing this location's exact boundaries.
// This also works on hosts without HTTP Range support; no full-world download.
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
export const zonesAt = lookup.find;
