import { HatDesign } from "../types/HatDesign";
import { Stitch } from "../types/Stitch";
import { SkyMarks } from "../types/SkyMarks";
import { designKey } from "./design-url";
const key = "space-current-hat";
export interface CachedHat { key: string; stitches: Stitch[]; sky: SkyMarks }
export function cacheHat(design: HatDesign, stitches: Stitch[], sky: SkyMarks) {
  try { sessionStorage.setItem(key, JSON.stringify({ key: designKey(design), stitches, sky })); } catch { /* regenerable */ }
}
export function readHat(design: HatDesign): CachedHat | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (value?.key === designKey(design) && Array.isArray(value.stitches) && value.stitches.length && Array.isArray(value.sky?.stars) && Array.isArray(value.sky?.constellations)) return value;
  } catch { /* invalid cache */ }
}
