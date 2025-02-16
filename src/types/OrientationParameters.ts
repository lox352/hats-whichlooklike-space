import DestinationType from "./DestinationType";
import { GlobalCoordinates } from "./GlobalCoordinates";

type OrientationParameters = {
  coordinates: GlobalCoordinates;
  targetDestination: DestinationType;
  maximumMagnitude: number;
  milkyWayResolution: 1 | 2 | 3 | 4 | 5; 
};

const defaultOrientationParameters: OrientationParameters = {
  coordinates: {
    latitude: 90,
    longitude: 0,
  },
  targetDestination: "crown",
  maximumMagnitude: 4,
  milkyWayResolution: 1,
};

export { defaultOrientationParameters };
export type { OrientationParameters };
