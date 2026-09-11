import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import { defaultOrientationParameters } from "../types/OrientationParameters";
import { settleTimeStep, solverIterations } from "../constants";
import { predictHatShape } from "../helpers/hat-shape";
import FrameHat, { OrbitLike } from "./FrameHat";
import StitchPhysics, { StitchPhysicsProps } from "./StitchPhysics";
export type ChainModelProps = Omit<
  StitchPhysicsProps,
  "orientationParameters" | "reducedMotion"
> & {
  orientationParameters?: StitchPhysicsProps["orientationParameters"];
  onFrameMetrics?: (metrics: { drawCalls: number; frameMs: number }) => void;
};
function FrameMetrics({
  onReport,
}: {
  onReport?: ChainModelProps["onFrameMetrics"];
}) {
  const count = useRef(0),
    total = useRef(0);
  useFrame(({ gl }, delta) => {
    total.current += delta * 1000;
    count.current++;
    if (count.current === 120) {
      onReport?.({
        drawCalls: gl.info.render.calls,
        frameMs: total.current / 120,
      });
      count.current = 0;
      total.current = 0;
    }
  });
  return null;
}
export default function ChainModel({
  orientationParameters = defaultOrientationParameters,
  onFrameMetrics,
  ...props
}: ChainModelProps) {
  const controls = useRef<OrbitLike | null>(null);
  const initial = useRef(props.stitches);
  const shape = useMemo(() => predictHatShape(initial.current), []);
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  return (
    <Canvas
      camera={{ fov: 38, near: 0.5, far: 4000 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
    >
      <FrameHat shape={shape} controls={controls} />
      <OrbitControls
        ref={controls as never}
        enableDamping={!reducedMotion}
        dampingFactor={0.08}
        rotateSpeed={0.65}
        zoomSpeed={0.7}
        makeDefault
      />
      <FrameMetrics onReport={onFrameMetrics} />
      <Physics
        gravity={[0, 9.81, 0]}
        timeStep={settleTimeStep}
        numSolverIterations={solverIterations}
        paused
      >
        <StitchPhysics
          {...props}
          orientationParameters={orientationParameters}
          reducedMotion={reducedMotion}
        />
      </Physics>
    </Canvas>
  );
}
