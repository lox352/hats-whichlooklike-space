import { MultiLineString, Position } from "geojson";
import constellations from "../assets/constellations.lines.json";
import milkyway from "../assets/mw_simplified.json";
import { GlobalCoordinates } from "../types/GlobalCoordinates";
import { RGB } from "../types/RGB";
import { point, polygon } from "@turf/helpers";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

export interface ConstellationData {
  id: string;
  points: Position[]; // Unique star coordinates
  lines: Position[][]; // Line segments between stars
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

const colourSpace = (
  allCoordinates: GlobalCoordinates[]
): { colours: RGB[]; connections: number[][] } => {
  const colours = allCoordinates.map((coordinate) => {
    const { latitude, longitude } = coordinate;
    const pt = point([longitude, latitude]);

    for (let i = 5; i >= 0; i--) {
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
  const connections = allCoordinates.map(() => [] as number[]);
  const starIndexMap = new Map<string, number>();

  const constellationData = parseConstellations();
  for (const constellation of Object.values(constellationData)) {
    // const colour = [255, 255, 255] as RGB;
    const colour = [
      Math.random() * 200 + 50,
      Math.random() * 200 + 50,
      Math.random() * 50 + 50,
    ] as RGB;
    for (const point of constellation.points) {
      let closestIndex = -1;
      let closestDistance = Infinity;

      for (let i = 0; i < allCoordinates.length; i++) {
        const [x1, y1] = point;
        const { latitude: y2, longitude: x2 } = allCoordinates[i];

        const distance = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = i;
        }
      }

      if (closestIndex !== -1) {
        starIndexMap.set(JSON.stringify(point), closestIndex);
        colours[closestIndex] = colour;
      }
    }
    for (const line of constellation.lines) {
      const star1 = starIndexMap.get(JSON.stringify(line[0]));
      const star2 = starIndexMap.get(JSON.stringify(line[1]));

      if (star1 !== undefined && star2 !== undefined) {
        connections[star1].push(star2);
      }
    }
  }
  return { colours, connections };
};

export default colourSpace;
