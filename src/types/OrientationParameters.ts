import DestinationType from "./DestinationType";
import { GlobalCoordinates } from "./GlobalCoordinates";

type OrientationParameters = {
  magnitudeLimit?: number;
  coordinates: GlobalCoordinates;
  targetDestination: DestinationType;
};

const defaultOrientationParameters: OrientationParameters = {
  coordinates: {
    latitude: 90,
    longitude: 0,
  },
  targetDestination: "crown",
  magnitudeLimit: 4,
};

export { defaultOrientationParameters };
export type { OrientationParameters };
