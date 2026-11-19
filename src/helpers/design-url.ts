import DestinationType from "../types/DestinationType";
import { DecreaseMethod } from "../types/KnittingMachine";
import {
  defaultHatDesign,
  HatDesign,
  SkyMoment,
  SkySource,
} from "../types/HatDesign";
import { RGB } from "../types/RGB";
import { brimNeedlesFor } from "./brim";

/**
 * Reads and writes a hat design as URL query parameters, so a design can be
 * shared as a link and survives a refresh.
 *
 * Keys are kept short because these end up in a hash route, and every value is
 * validated on the way back in: a link is untrusted input, and a bad number
 * must fall back rather than produce a broken hat.
 */

const keys = {
  stitchesPerRow: "sts",
  numberOfRows: "rows",
  decreaseMethod: "dec",
  latitude: "lat",
  longitude: "lon",
  destination: "to",
  magnitude: "mag",
  /* The source of the sky point, when there was one. */
  when: "when",
  where: "where",
  zone: "tz",
  needles: "ndl",
  brimRounds: "brim",
  brimNeedles: "bndl",
  trim: "trim",
} as const;

const hexOf = (colour: RGB): string =>
  colour.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("");

const colourOf = (raw: string | null): RGB | undefined => {
  const match = raw ? /^#?([0-9a-f]{6})$/i.exec(raw) : null;
  if (!match) return undefined;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const decreaseMethods: DecreaseMethod[] = ["Hemispherical", "Pyramidal"];
const destinations: DestinationType[] = ["crown", "front", "rim"];

const readNumber = (
  params: URLSearchParams,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number => {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
};

export const designToSearchParams = (design: HatDesign): URLSearchParams => {
  const params = new URLSearchParams();
  params.set(keys.stitchesPerRow, String(design.stitchesPerRow));
  params.set(keys.numberOfRows, String(design.numberOfRows));
  params.set(keys.decreaseMethod, design.decreaseMethod);
  // Two decimals is ~1km on the ground, which is far finer than a stitch.
  params.set(keys.latitude, design.orientation.coordinates.latitude.toFixed(2));
  params.set(
    keys.longitude,
    design.orientation.coordinates.longitude.toFixed(2),
  );
  params.set(keys.destination, design.orientation.targetDestination);
  params.set(keys.magnitude, String(design.orientation.magnitudeLimit ?? 4));
  params.set(keys.needles, String(design.needles));
  params.set(keys.brimRounds, String(design.brim.rounds));
  params.set(keys.brimNeedles, String(design.brim.needles));
  params.set(keys.trim, hexOf(design.brim.colour));
  if (design.source) {
    const { moment, place, zone } = design.source;
    params.set(keys.when, formatMoment(moment));
    params.set(
      keys.where,
      `${place.latitude.toFixed(2)},${place.longitude.toFixed(2)}`,
    );
    if (zone) params.set(keys.zone, zone);
  }
  return params;
};

const pad = (value: number) => String(value).padStart(2, "0");

/** A local clock time as `YYYY-MM-DDTHH:MM`: readable in a link, no zone. */
export const formatMoment = (moment: SkyMoment): string =>
  `${moment.year}-${pad(moment.month)}-${pad(moment.day)}T${pad(moment.hour)}:${pad(moment.minute)}`;

const parseMoment = (raw: string | null): SkyMoment | undefined => {
  if (!raw) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(raw);
  if (!match) return undefined;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const inRange =
    year >= 1900 && year <= 2200 &&
    month >= 1 && month <= 12 &&
    day >= 1 && day <= 31 &&
    hour >= 0 && hour <= 23 &&
    minute >= 0 && minute <= 59;
  return inRange ? { year, month, day, hour, minute } : undefined;
};

const parsePlace = (raw: string | null) => {
  if (!raw) return undefined;
  const [latitude, longitude] = raw.split(",").map(Number);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return undefined;
  return { latitude, longitude };
};

const sourceFrom = (params: URLSearchParams): SkySource | undefined => {
  const moment = parseMoment(params.get(keys.when));
  const place = parsePlace(params.get(keys.where));
  if (!moment || !place) return undefined;
  const zone = params.get(keys.zone) ?? undefined;
  return { moment, place, ...(zone ? { zone } : {}) };
};

export const designFromSearchParams = (
  params: URLSearchParams,
  fallback: HatDesign = defaultHatDesign,
): HatDesign => {
  const decreaseRaw = params.get(keys.decreaseMethod);
  const decreaseMethod = decreaseMethods.includes(decreaseRaw as DecreaseMethod)
    ? (decreaseRaw as DecreaseMethod)
    : fallback.decreaseMethod;

  const destinationRaw = params.get(keys.destination);
  const targetDestination = destinations.includes(
    destinationRaw as DestinationType,
  )
    ? (destinationRaw as DestinationType)
    : fallback.orientation.targetDestination;

  /*
   * A link from before there were brims has a stitch count and no brim: it
   * is for a hat with none, and still makes one. Only a link with nothing in
   * it at all takes the brim a new design starts with.
   */
  const brimRaw = params.get(keys.brimRounds);
  const brimRounds =
    brimRaw === null
      ? params.has(keys.stitchesPerRow)
        ? 0
        : fallback.brim.rounds
      : Math.round(readNumber(params, keys.brimRounds, fallback.brim.rounds, 0, 400));
  const needles = readNumber(params, keys.needles, fallback.needles, 1, 25);

  return {
    // Generous bounds: validateDesign reports the real limits to the user, so
    // clamping here only needs to keep the numbers sane.
    stitchesPerRow: Math.round(
      readNumber(params, keys.stitchesPerRow, fallback.stitchesPerRow, 0, 2000),
    ),
    numberOfRows: Math.round(
      readNumber(params, keys.numberOfRows, fallback.numberOfRows, 0, 2000),
    ),
    decreaseMethod,
    needles,
    brim: {
      rounds: brimRounds,
      needles: readNumber(
        params,
        keys.brimNeedles,
        params.has(keys.needles) ? brimNeedlesFor(needles) : fallback.brim.needles,
        1,
        25,
      ),
      colour: colourOf(params.get(keys.trim)) ?? fallback.brim.colour,
    },
    orientation: {
      coordinates: {
        latitude: readNumber(
          params,
          keys.latitude,
          fallback.orientation.coordinates.latitude,
          -90,
          90,
        ),
        longitude: readNumber(
          params,
          keys.longitude,
          fallback.orientation.coordinates.longitude,
          -180,
          180,
        ),
      },
      targetDestination,
      magnitudeLimit: readNumber(
        params,
        keys.magnitude,
        fallback.orientation.magnitudeLimit ?? 4,
        0,
        6,
      ),
    },
    ...(() => {
      const source = sourceFrom(params);
      return source ? { source } : {};
    })(),
  };
};

/**
 * A stable identity for a design, used to tell whether a hat cached from an
 * earlier visit still matches the design being asked for.
 */
export const designKey = (design: HatDesign): string =>
  designToSearchParams(design).toString();
