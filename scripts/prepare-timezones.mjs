import { readFile, mkdir, writeFile, copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
const require = createRequire(import.meta.url);
const root = resolve(dirname(require.resolve("geo-tz/all")), "..");
const { version } = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8"),
);
const source = JSON.parse(
  await readFile(
    new URL("../src/data/timezone-source.json", import.meta.url),
    "utf8",
  ),
);
if (version !== source.version)
  throw new Error("Update timezone-source.json when updating geo-tz.");
const output = new URL(`../public/timezones/${version}/`, import.meta.url);
await mkdir(output, { recursive: true });
const data = await readFile(resolve(root, "data/timezones.geojson.geo.dat"));
for (let start = 0; start < data.length; start += source.chunkBytes) {
  await writeFile(
    new URL(`${start / source.chunkBytes}.dat`, output),
    data.subarray(start, start + source.chunkBytes),
  );
}
await copyFile(
  resolve(root, "data/timezones.geojson.index.json"),
  new URL("index.json", output),
);
console.log(
  `Prepared exact timezone boundaries (${Math.ceil(data.length / source.chunkBytes)} independently loaded chunks).`,
);
