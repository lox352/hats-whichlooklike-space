import {
  minimumSettleFrames,
  restMotionThreshold,
  settleRestSeconds,
  settleTimeStep,
} from "../constants";
/** Rest is measured in simulated time, independent of rendering or batching. */
export function createRestDetector() {
  let steps = 0,
    quiet = 0;
  return (meanMotion: number) => {
    steps++;
    quiet =
      meanMotion < restMotionThreshold && steps >= minimumSettleFrames
        ? quiet + 1
        : 0;
    return quiet >= Math.ceil(settleRestSeconds / settleTimeStep);
  };
}
export interface SettleMetrics {
  steps: number;
  wallMs: number;
  height: number;
  meanMotion: number;
}
