import DestinationType from "./DestinationType";
import { GlobalCoordinates } from "./GlobalCoordinates";

type OrientationParameters = {
  coordinates: GlobalCoordinates;
  targetDestination: DestinationType;
};

const defaultOrientationParameters: OrientationParameters = {
  coordinates: {
    latitude: 90,
    longitude: 0,
  },
  targetDestination: "crown",
};

export { defaultOrientationParameters };
export type { OrientationParameters };
