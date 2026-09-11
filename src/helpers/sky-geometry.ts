import { Point } from "../types/Point";
import { GlobalCoordinates } from "../types/GlobalCoordinates";
import { OrientationParameters } from "../types/OrientationParameters";

/*
 * Where a stitch looks, and how the hat is turned to face the chosen sky.
 *
 * Pure geometry, shared by the projection and its tests, with nothing
 * imported from the modules that use it.
 */

/**
 * asin/acos are only defined on [-1, 1], and float error can push us just
 * past. NaN is the one input with no sensible clamp, so it becomes 0;
 * infinities clamp to the interval ends like any other out-of-range value.
 */
const clampToUnit = (value: number): number => {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, -1), 1);
};

function rotateAboutAxis(
  coord: GlobalCoordinates,
  angle: number
): GlobalCoordinates {
  const { latitude, longitude } = coord;
  const newLongitude = longitude + angle;
  if (newLongitude > 180) {
    return { latitude, longitude: newLongitude - 360 };
  }
  if (newLongitude < -180) {
    return { latitude, longitude: newLongitude + 360 };
  }
  return { latitude, longitude: newLongitude };
}

/**
 * Rotates the unit sphere about the axis through {lat 0, lon +/-90}, which
 * slides points along the lon = 0 meridian. A point at {lat: t, lon: 0} ends up
 * at {lat: t + angleInDegrees, lon: 0}.
 *
 * Note this *adds* to the latitude rather than zeroing it. That is deliberate:
 * see rotateToDestination, which maps hat coordinates onto the sky (the
 * inverse of what you might expect), and relies on this direction.
 */
function rotateVertically(
  coord: GlobalCoordinates,
  angleInDegrees: number
): GlobalCoordinates {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const toDegrees = (radians: number) => (radians * 180) / Math.PI;

  const latRad = toRadians(coord.latitude);
  const lonRad = toRadians(coord.longitude);
  const angleRad = toRadians(angleInDegrees);

  const sinAngle = Math.sin(angleRad);
  const cosAngle = Math.cos(angleRad);

  const x = Math.cos(latRad) * Math.cos(lonRad);
  const y = Math.cos(latRad) * Math.sin(lonRad);
  const z = Math.sin(latRad);

  // Rotation about the y axis.
  const xRot = cosAngle * x - sinAngle * z;
  const yRot = y;
  const zRot = sinAngle * x + cosAngle * z;

  return {
    latitude: toDegrees(Math.asin(clampToUnit(zRot))),
    longitude: toDegrees(Math.atan2(yRot, xRot)),
  };
}

const verticalAngleFor = (orientationParameters: OrientationParameters) => {
  const { latitude } = orientationParameters.coordinates;
  switch (orientationParameters.targetDestination) {
    case "front":
      return latitude;
    case "crown":
      return latitude - 90;
    case "rim":
      return latitude + 90;
    default:
      throw new Error(
        `Invalid target destination: ${orientationParameters.targetDestination}`
      );
  }
};

/**
 * Maps a coordinate in *hat space* to the coordinate in the sky that should
 * be looked up for it, such that the user's chosen point lands on their chosen
 * part of the hat.
 *
 * Because this is the inverse mapping, latitude is applied first and longitude
 * second. The three anchors in hat space are: crown = {90, 0}, front = {0, 0},
 * rim = {-90, 0}; each is carried to the target coordinate.
 *
 * Both steps are rotations of the sphere, so angles between points survive:
 * a star 2° from another in the sky is 2° from it in hat space too.
 */
function rotateToDestination(
  coord: GlobalCoordinates,
  orientationParameters: OrientationParameters
): GlobalCoordinates {
  const rotated = rotateVertically(coord, verticalAngleFor(orientationParameters));
  return rotateAboutAxis(rotated, orientationParameters.coordinates.longitude);
}

/**
 * The inverse: from a sky coordinate to where it sits in hat space. The
 * projection needs this to ask whether a star is above the brim, which is a
 * question about the hat, not the sky.
 */
function rotateFromDestination(
  coord: GlobalCoordinates,
  orientationParameters: OrientationParameters
): GlobalCoordinates {
  const unspun = rotateAboutAxis(coord, -orientationParameters.coordinates.longitude);
  return rotateVertically(unspun, -verticalAngleFor(orientationParameters));
}

/**
 * The direction a settled stitch faces, as latitude and longitude in hat
 * space, treating the hat as a sphere centred half way up its height.
 *
 * Spherical all the way down, brim included. The earth branch switches to a
 * cylindrical mapping below the equator so a map stays continuous down the
 * straight sides of the hat. That is not done here, deliberately: a sky is
 * not a map with a north and a south edge, the brim of this hat is a horizon,
 * and every hat charted so far was charted this way. Changing it would move
 * every star on every hat.
 */
const getGlobalCoordinates = (
  position: Point,
  maxY: number
): GlobalCoordinates => {
  const { x, y, z } = position;
  const heightAboveEquator = y - maxY / 2;
  const radius = Math.sqrt(
    x * x + heightAboveEquator * heightAboveEquator + z * z
  );
  if (radius === 0) return { latitude: 90, longitude: 0 };

  const longitude =
    Math.atan2(z / radius, -x / radius) * (180 / Math.PI);
  const latitude =
    Math.asin(clampToUnit(heightAboveEquator / radius)) * (180 / Math.PI);
  return { latitude, longitude };
};

/**
 * The sky coordinate a single stitch position looks at, after orientation.
 * Exported for testing.
 */
const skyCoordinatesForStitch = (
  position: Point,
  maxY: number,
  orientationParameters: OrientationParameters
): GlobalCoordinates =>
  rotateToDestination(
    getGlobalCoordinates(position, maxY),
    orientationParameters
  );


export {
  clampToUnit,
  rotateToDestination,
  rotateFromDestination,
  getGlobalCoordinates,
  skyCoordinatesForStitch,
};
