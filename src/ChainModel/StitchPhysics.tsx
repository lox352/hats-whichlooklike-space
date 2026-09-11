import { createRef, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RapierRigidBody } from "@react-three/rapier";
import { Stitch } from "../types/Stitch";
import { SkyMarks } from "../types/SkyMarks";
import { OrientationParameters } from "../types/OrientationParameters";
import { colourNodes } from "../helpers/node-colouring";
import { dyeOrderFromHeights } from "../helpers/dye-sweep";
import {
  adjacentStitchDistance,
  verticalStitchDistance,
  dyeSweepSeconds,
  maxDyeStepSeconds,
} from "../constants";
import { SettleMetrics } from "../helpers/settling";
import StitchBody from "./StitchBody";
import StitchInstances from "./StitchInstances";
import ConstellationLines from "./ConstellationLines";
import Settler from "./Settler";
import Link from "./Link";
export interface StitchPhysicsProps {
  stitches: Stitch[];
  sky: SkyMarks;
  setStitches?: (stitches: Stitch[]) => void;
  setSky?: (sky: SkyMarks) => void;
  orientationParameters: OrientationParameters;
  simulationActive: boolean;
  setSimulationActive?: (active: boolean) => void;
  onReady?: () => void;
  onMetrics?: (metrics: SettleMetrics) => void;
  reducedMotion: boolean;
}
export default function StitchPhysics({
  stitches,
  sky,
  setStitches,
  setSky,
  orientationParameters,
  simulationActive,
  setSimulationActive,
  onReady,
  onMetrics,
  reducedMotion,
}: StitchPhysicsProps) {
  const stitchRefs = useRef<React.RefObject<RapierRigidBody>[]>([]);
  if (!stitchRefs.current.length)
    stitchRefs.current = stitches.map(() => createRef<RapierRigidBody>());
  const drawn = useMemo(() => stitches.filter((s) => s.id > 0), [stitches]);
  const targetColours = useRef<Float32Array | null>(null),
    order = useRef<Float32Array | null>(null),
    progress = useRef(0),
    sweeping = useRef(false),
    ready = useRef(false);
  const initialised = useRef(false);
  const pack = (source: Stitch[]) =>
    new Float32Array(
      source
        .filter((s) => s.id > 0)
        .flatMap((s) => s.colour.map((c) => c / 255)),
    );
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    if (setStitches) {
      setSimulationActive?.(true);
    } else {
      targetColours.current = pack(stitches);
      order.current = new Float32Array(drawn.length);
      progress.current = 1;
      ready.current = true;
      onReady?.();
    }
  }, [drawn.length, onReady, setSimulationActive, setStitches, stitches]);
  useFrame((_, delta) => {
    if (!sweeping.current || ready.current) return;
    progress.current = reducedMotion
      ? 1
      : Math.min(
          1,
          progress.current +
            Math.min(delta, maxDyeStepSeconds) / dyeSweepSeconds,
        );
    if (progress.current === 1) {
      ready.current = true;
      onReady?.();
    }
  });
  return (
    <>
      {setStitches && (
        <Settler
          active={simulationActive}
          stitchRefs={stitchRefs}
          onSettled={(positions, metrics) => {
            const { colours, sky: chartedSky } = colourNodes(
              positions,
              orientationParameters,
            );
            const charted = stitches.map((s, i) => ({
              ...s,
              position: positions[i],
              colour: colours[i],
            }));
            targetColours.current = pack(charted);
            order.current = dyeOrderFromHeights(
              drawn.map((s) => positions[s.id].y),
            );
            sweeping.current = true;
            setStitches?.(charted);
            setSky?.(chartedSky);
            setSimulationActive?.(false);
            onMetrics?.(metrics);
          }}
        />
      )}
      {setStitches &&
        stitches.map((s) => (
          <StitchBody
            key={s.id}
            rigidBodyRef={stitchRefs.current[s.id]}
            position={s.position}
            fixed={s.links.length <= 1}
          />
        ))}
      <StitchInstances
        moving={simulationActive}
        stitches={stitches}
        stitchRefs={stitchRefs}
        dyeProgress={progress}
        colours={targetColours}
        dyeOrder={order}
      />
      {setStitches &&
        stitches.flatMap((s) =>
          s.links.map((link) => (
            <Link
              key={`${s.id}-${link}`}
              bodyA={stitchRefs.current[s.id]}
              bodyB={stitchRefs.current[link]}
              maxLength={
                s.id - link === 1
                  ? adjacentStitchDistance
                  : verticalStitchDistance
              }
            />
          )),
        )}
      <ConstellationLines stitches={stitches} sky={sky} />
    </>
  );
}
