import { createRef, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RapierRigidBody } from "@react-three/rapier";
import { Stitch } from "../types/Stitch";
import { SkyMarks } from "../types/SkyMarks";
import { OrientationParameters } from "../types/OrientationParameters";
import { colourNodes } from "../helpers/node-colouring";
import { dyeOrderFromHeights } from "../helpers/dye-sweep";
import { displayYarn, readYarns } from "../helpers/yarn-preference";
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
  /**
   * Present when the hat is to be settled and charted; absent for a saved
   * hat, which is shown as it was with no simulation at all.
   */
  setStitches?: (stitches: Stitch[]) => void;
  setSky?: (sky: SkyMarks) => void;
  orientationParameters: OrientationParameters;
  simulationActive: boolean;
  setSimulationActive?: (active: boolean) => void;
  /** The sky has finished arriving on the hat. */
  onReady?: () => void;
  onMetrics?: (metrics: SettleMetrics) => void;
  reducedMotion: boolean;
}

/**
 * The hat as a physical object, and the sky arriving on it.
 *
 * Every stitch is a rigid body joined to its neighbours by rope joints, and
 * the Settler steps the world until the tube has relaxed into a hat. Once it
 * is still, the resting positions go to the projection, which decides which
 * stitch each star sits on; the colours then sweep onto the instanced mesh
 * from the crown down over a couple of seconds, so you watch the night fall
 * on the hat rather than seeing it appear in one frame.
 *
 * The colours live in a Float32Array shared with the mesh rather than in
 * React state: one update per frame, not one per stitch.
 */
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
  // Stitch 0 is the phantom start of the helix and is never drawn.
  const drawn = useMemo(() => stitches.filter((s) => s.id > 0), [stitches]);
  const targetColours = useRef<Float32Array | null>(null);
  const order = useRef<Float32Array | null>(null);
  const progress = useRef(0);
  const sweeping = useRef(false);
  const ready = useRef(false);
  const initialised = useRef(false);
  // The hat is shown in the yarns as they are shown on the chart, not in the
  // pattern's identity colours, so the two agree.
  const pack = (source: Stitch[]) => {
    const yarns = readYarns();
    return new Float32Array(
      source
        .filter((s) => s.id > 0)
        .flatMap((s) => displayYarn(s.colour, yarns).colour.map((c) => c / 255)),
    );
  };
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
  // The sweep: advance the dye front, clamped so a stalled frame cannot
  // carry it to the end in one jump.
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
