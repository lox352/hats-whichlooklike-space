import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { find as reference } from "geo-tz/all";
import { findTimeZones } from "./time-zone-helper";
const requests: string[] = [];
beforeAll(() =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      requests.push(url);
      const bytes = await readFile(resolve("public", url.replace(/^\//, "")));
      return {
        ok: true,
        json: async () => JSON.parse(bytes.toString()),
        arrayBuffer: async () =>
          bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ),
      };
    }),
  ),
);
afterAll(() => vi.unstubAllGlobals());
it.each([
  [40.7128, -74.006],
  [-33.8688, 151.2093],
  [51.5074, -0.1278],
  [27.7172, 85.324],
  [33.4484, -112.074],
  [-31.55, 159.08],
  [-43.95, -176.55],
  [0, 0],
  [49.01, 8.4],
  [50.1, 14.4],
  [37.88, -89.2],
])(
  "matches exact all-history boundaries at %s,%s",
  async (latitude, longitude) => {
    expect(await findTimeZones({ latitude, longitude })).toEqual(
      reference(latitude, longitude),
    );
  },
);
it("loads only local chunks, from this site, and caches repeated coordinates", async () => {
  const before = requests.length;
  await findTimeZones({ latitude: 40.7128, longitude: -74.006 });
  expect(requests.length).toBe(before);
  expect(requests.every((path) => path.startsWith("/timezones/8.1.8/"))).toBe(
    true,
  );
  expect(requests.filter((p) => p.endsWith("index.json"))).toHaveLength(1);
  expect(requests.length).toBeLessThan(30);
});
it("rejects invalid locations instead of defaulting to UTC", async () => {
  await expect(
    findTimeZones({ latitude: NaN, longitude: 0 }),
  ).rejects.toThrow();
});
