import { MultiLineString, Position } from "geojson";
import constellations from "../assets/constellations.lines.json";
import milkyway from "../assets/mw_simplified.json";
import { GlobalCoordinates } from "../types/GlobalCoordinates";
import { RGB } from "../types/RGB";
import { point, polygon } from "@turf/helpers";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import stars from "../assets/stars.6.json";

export interface ConstellationData {
  id: string;
  points: Position[]; // Unique star coordinates
  lines: Position[][]; // Line segments between stars
}

export interface StarInformation {
  bvIndex: number | null;
  magnitude: number | null;
  connectedStars: Map<string, number[]>;
}

export interface ProcessedConstellationData {
  id: string;
  connections: [number, number][];
}

export type ParsedConstellations = Record<string, ConstellationData>;

/**
 * Parses a GeoJSON FeatureCollection containing constellation line data.
 * Extracts points and lines, grouping them by constellation ID.
 *
 * @param geojson - A valid GeoJSON FeatureCollection
 * @returns A record of constellation data, each with unique points and line segments.
 */
const parseConstellations = (): ParsedConstellations => {
  if (constellations.type !== "FeatureCollection") {
    throw new Error("Invalid GeoJSON: Expected FeatureCollection.");
  }

  const dataByConstellation: ParsedConstellations = {};

  for (const feature of constellations.features) {
    if (!feature.id || feature.geometry?.type !== "MultiLineString") continue;

    const id = feature.id.toString();
    const geometry = feature.geometry as MultiLineString;

    if (!dataByConstellation[id]) {
      dataByConstellation[id] = { id, points: [], lines: [] };
    }

    const uniquePoints = new Set<string>();

    for (const line of geometry.coordinates) {
      for (let i = 0; i < line.length - 1; i++) {
        const point1 = line[i];
        const point2 = line[i + 1];
        dataByConstellation[id].lines.push([point1, point2]);
        uniquePoints.add(JSON.stringify(point1)); // Ensure unique points
        uniquePoints.add(JSON.stringify(point2)); // Ensure unique points
      }
    }

    // Convert Set back to an array of coordinates
    dataByConstellation[id].points = Array.from(uniquePoints).map((s) =>
      JSON.parse(s)
    );
  }

  return dataByConstellation;
};

const findClosestIndex = (
  targetPoint: Position,
  allCoordinates: GlobalCoordinates[]
): number | null => {
  let closestIndex = null;
  let closestDistance = Infinity;

  for (let i = 0; i < allCoordinates.length; i++) {
    const [x1, y1] = targetPoint;
    const { latitude: y2, longitude: x2 } = allCoordinates[i];

    const distance = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = i;
    }
  }

  return closestIndex;
};

const colourSpace = (
  allCoordinates: GlobalCoordinates[],
  allCoordinatesUnrotated: GlobalCoordinates[],
  unrotatePoint: (coordinate: GlobalCoordinates) => GlobalCoordinates,
  rotatePoint: (coordinate: GlobalCoordinates) => GlobalCoordinates,
  colourConstellation = false,
  colourMilkyWay = 5, // Max value is 5
  showStarsUpToMagnitude = 5 // Max value is 6
): { colours: RGB[]; starInformation: StarInformation[] } => {
  const colours = allCoordinates.map((coordinate) => {
    const { latitude, longitude } = coordinate;
    const pt = point([longitude, latitude]);

    for (let i = colourMilkyWay; i >= 0; i--) {
      const feature = milkyway.features.find(
        (f) => f.properties.id === `ol${i}`
      );
      if (feature) {
        let poly;
        if (feature.geometry.type === "Polygon") {
          poly = polygon(feature.geometry.coordinates as number[][][]);
        } else if (feature.geometry.type === "MultiPolygon") {
          poly = polygon(feature.geometry.coordinates.flat() as number[][][]);
        }
        if (poly && booleanPointInPolygon(pt, poly)) {
          const brightness = (i / 5) * 200 + 50; // Scale brightness between 50 and 250
          return [brightness, brightness, 250] as RGB;
        }
      }
    }
    return [0, 0, 50] as RGB;
  });

  const starInformation = allCoordinates.map(() => {
    return { connectedStars: new Map<string, number[]>() } as StarInformation;
  });

  const starIndexMap = new Map<string, number>(); // Map from coordinates (stringified) to index

  for (const star of stars.features) {
    const point = star.geometry.coordinates as [number, number] as Position;
    if (
      unrotatePoint({ latitude: point[1], longitude: point[0] }).latitude <
      allCoordinatesUnrotated[0].latitude
    ) {
      continue;
    }

    const closestIndex = findClosestIndex(point, allCoordinates);

    if (!closestIndex) {
      continue;
    }

    starInformation[closestIndex].bvIndex = parseFloat(star.properties.bv);
    starInformation[closestIndex].magnitude = star.properties.mag;
    if (star.properties.mag < showStarsUpToMagnitude) {
      colours[closestIndex] = [255, 255, 255] as RGB;
    }
  }

  const constellationData = parseConstellations();
  for (const constellation of Object.values(constellationData)) {
    const colour = [
      Math.random() * 200 + 50,
      Math.random() * 200 + 50,
      Math.random() * 50 + 50,
    ] as RGB;

    for (const point of constellation.points) {
      if (
        unrotatePoint({ latitude: point[1], longitude: point[0] }).latitude <
        allCoordinatesUnrotated[0].latitude
      ) {
        continue;
      }

      const closestIndex = findClosestIndex(point, allCoordinates);
      if (!closestIndex) {
        continue;
      }
      if (colourConstellation) {
        colours[closestIndex] = colour;
      }
      starIndexMap.set(JSON.stringify(point), closestIndex);
    }

    for (const line of constellation.lines) {
      const star1 = starIndexMap.get(JSON.stringify(line[0]));
      const star2 = starIndexMap.get(JSON.stringify(line[1]));

      if (star1 !== undefined && star2 !== undefined) {
        if (!starInformation[star1].connectedStars.has(constellation.id)) {
          starInformation[star1].connectedStars.set(constellation.id, [star2]);
        } else {
          starInformation[star1].connectedStars
            .get(constellation.id)!
            .push(star2);
        }

        if (!starInformation[star2].connectedStars.has(constellation.id)) {
          starInformation[star2].connectedStars.set(constellation.id, [star1]);
        } else {
          starInformation[star2].connectedStars
            .get(constellation.id)!
            .push(star1);
        }
        continue;
      }

      if (star1 === 3172 || star2 === 3172) {
        console.log(constellation);
        console.log(line);
      }

      if (star1) {
        const star2 = { latitude: line[1][1], longitude: line[1][0] };
        const unrotatedStar2 = unrotatePoint(star2);
        const reflectedUnrotatedStar2 = {
          ...unrotatedStar2,
          latitude: 2 * allCoordinatesUnrotated[0].latitude - unrotatedStar2.latitude,
        };
        const phantomStar2 = rotatePoint(reflectedUnrotatedStar2);
        const phantomStar2Index = findClosestIndex(
          [phantomStar2.longitude, phantomStar2.latitude],
          allCoordinates
        );

        if (!starInformation[star1].connectedStars.has(constellation.id)) {
          starInformation[star1].connectedStars.set(constellation.id, [-phantomStar2Index!]);
        } else {
          starInformation[star1].connectedStars
            .get(constellation.id)!
            .push(-phantomStar2Index!);
        }
      }

      if (star2) {
        const star1 = { latitude: line[0][1], longitude: line[0][0] };
        const unrotatedStar1 = unrotatePoint(star1);
        const reflectedUnrotatedStar1 = {
          ...unrotatedStar1,
          latitude: 2 * allCoordinatesUnrotated[0].latitude - unrotatedStar1.latitude,
        };
        const phantomStar1 = rotatePoint(reflectedUnrotatedStar1);
        const phantomStar1Index = findClosestIndex(
          [phantomStar1.longitude, phantomStar1.latitude],
          allCoordinates
        );

        if (!starInformation[star2].connectedStars.has(constellation.id)) {
          starInformation[star2].connectedStars.set(constellation.id, [-phantomStar1Index!]);
        } else {
          starInformation[star2].connectedStars
            .get(constellation.id)!
            .push(-phantomStar1Index!);
        }
      }
    }
  }

  return { colours, starInformation };
};

export default colourSpace;
