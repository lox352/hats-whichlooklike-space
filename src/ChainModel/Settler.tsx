import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RapierRigidBody, useRapier } from "@react-three/rapier";
import {
  settleStepBudgetMs,
  settleSubsteps,
  settleTimeStep,
} from "../constants";
import { createRestDetector, SettleMetrics } from "../helpers/settling";
import { Point } from "../types/Point";
interface SettlerProps {
  active: boolean;
  stitchRefs: React.MutableRefObject<React.RefObject<RapierRigidBody>[]>;
  /** Called once, with every stitch's resting position, when the hat is still. */
  onSettled: (positions: Point[], metrics: SettleMetrics) => void;
}

/**
 * Drives the physics world while the hat is settling, and says when it has.
 *
 * Rapier's Physics component is left paused so it never steps on its own. Its
 * two built-in modes both derive the step from real elapsed time - "vary" uses
 * the frame delta directly, and a fixed timeStep runs an accumulator against
 * the clock - which means the number of steps taken depends on how fast the
 * machine renders. Stepping here instead gives the same simulation on every
 * machine.
 *
 * Rest is judged after every step, in simulated time rather than wall time,
 * for the same reason: "quiet for two seconds" has to mean two seconds of the
 * hat's time, however many frames that took to draw.
 *
 * step() comes from the Rapier context and does the world step and the mesh
 * sync together, so the stitches follow along as they move.
 */
export default function Settler({ active, stitchRefs, onSettled }: SettlerProps) {
  const { step } = useRapier();
  const rest = useRef(createRestDetector());
  const complete = useRef(false);
  const count = useRef(0);
  const started = useRef(0);

  useFrame(() => {
    if (
      !active ||
      complete.current ||
      stitchRefs.current.some((r) => !r.current)
    )
      return;
    if (!started.current) started.current = performance.now();
    const deadline = performance.now() + settleStepBudgetMs;
    for (let i = 0; i < settleSubsteps; i++) {
      step(settleTimeStep);
      count.current++;
      let motion = 0;
      for (const ref of stitchRefs.current) {
        const v = ref.current!.linvel();
        motion += Math.abs(v.x) + Math.abs(v.y) + Math.abs(v.z);
      }
      const meanMotion = motion / stitchRefs.current.length;
      if (rest.current(meanMotion)) {
        complete.current = true;
        const positions = stitchRefs.current.map((r) =>
          r.current!.translation(),
        );
        onSettled(positions, {
          steps: count.current,
          wallMs: performance.now() - started.current,
          height: Math.max(...positions.map((p) => p.y)),
          meanMotion,
        });
        break;
      }
      if (performance.now() >= deadline) break;
    }
  });
  return null;
}
