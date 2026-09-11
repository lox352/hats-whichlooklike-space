import {
  minimumSettleFrames,
  restMotionThreshold,
  settleRestSeconds,
  settleTimeStep,
} from "../constants";
/**
 * Decides when the hat has come to rest.
 *
 * Fed the mean per-stitch motion after every physics step, and true once it
 * has stayed under the threshold for `settleRestSeconds` of simulated time -
 * a stray step back over the threshold restarts the count. Counting steps
 * rather than frames means the answer does not depend on how fast the
 * machine draws, which is the whole point of stepping the world by hand.
 *
 * The first quiet step is not the end of the movement: the fabric is still
 * easing into shape when the motion first drops, so stopping there froze the
 * hat a moment early.
 */
export function createRestDetector() {
  let steps = 0;
  let quiet = 0;
  return (meanMotion: number) => {
    steps++;
    quiet =
      meanMotion < restMotionThreshold && steps >= minimumSettleFrames
        ? quiet + 1
        : 0;
    return quiet >= Math.ceil(settleRestSeconds / settleTimeStep);
  };
}
/** What the settle took, for the diagnostics and the measurement suite. */
export interface SettleMetrics {
  steps: number;
  wallMs: number;
  height: number;
  meanMotion: number;
}
