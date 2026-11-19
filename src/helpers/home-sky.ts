import zonePlaces from "../data/zone-places.json";
import { defaultHatDesign, HatDesign, SkyMoment } from "../types/HatDesign";

/**
 * Where a new sky starts: tonight's - this minute's - over the biggest place
 * in the browser's own time zone, which is as near to "here" as can be known
 * without asking. Anyone elsewhere searches for their place; nobody starts
 * from a bare right ascension and declination.
 */

type ZonePlace = [name: string, region: string, latitude: number, longitude: number];

const places = zonePlaces as unknown as Record<string, ZonePlace>;

/** The zone to fall back on, when the browser's is unknown or has no town. */
const greenwich = "Europe/London";

export const homeOf = (zone: string | undefined): { zone: string; place: ZonePlace } => {
  const known = zone && places[zone] ? zone : greenwich;
  return { zone: known, place: places[known] };
};

const browserZone = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

const momentOf = (date: Date): SkyMoment => ({
  year: date.getFullYear(),
  month: date.getMonth() + 1,
  day: date.getDate(),
  hour: date.getHours(),
  minute: date.getMinutes(),
});

/** A new design, with its night and place, and what to call the place. */
export const freshDesign = (
  zone = browserZone(),
  date = new Date()
): { design: HatDesign; label: string } => {
  const home = homeOf(zone);
  const [name, region, latitude, longitude] = home.place;
  return {
    design: {
      ...defaultHatDesign,
      orientation: { ...defaultHatDesign.orientation, targetDestination: "crown" },
      source: {
        moment: momentOf(date),
        place: { latitude, longitude },
        // The clock the browser keeps, which is this place's.
        ...(home.zone === zone ? { zone } : {}),
      },
    },
    label: `${name}, ${region}`,
  };
};
