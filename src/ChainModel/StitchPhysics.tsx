import React, { MutableRefObject, useEffect, useRef, useState } from "react";
import PointMass from "./PointMass";
import Link from "./Link";
import { RapierRigidBody } from "@react-three/rapier";
import { Stitch } from "../types/Stitch";
import { colourNodes } from "../helpers/node-colouring";
import * as THREE from "three";
import { adjacentStitchDistance, verticalStitchDistance } from "../constants";
import { useFrame } from "@react-three/fiber";
import { OrientationParameters } from "../types/OrientationParameters";
import { Line } from "@react-three/drei";

function createChevronTexture() {
  const size = 256; // Texture resolution
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Background (optional)
    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = "white";

    // Draw downward-facing chevron
    ctx.beginPath();
    ctx.moveTo(size / 2, size * 1); // Bottom center (tip of the V)
    ctx.lineTo(size * 0, size * 0); // Left top
    ctx.lineTo(size * 0.25, size * 0); // Left top
    ctx.lineTo(size * 0.5, size * 0.5); // Center bottom left
    ctx.lineTo(size * 0.75, size * 0); // Right top
    ctx.lineTo(size * 1, size * 0); // Right top
    ctx.lineTo(size / 2, size * 1); // Back to bottom center
    ctx.closePath();
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

const geometry = new THREE.PlaneGeometry(1, 1);
const chevronTexture = createChevronTexture();

interface StitchPhysicsProps {
  stitchesRef: React.MutableRefObject<Stitch[]>;
  setStitches?: React.Dispatch<React.SetStateAction<Stitch[]>>;
  orientationParameters: OrientationParameters;
  simulationActive: boolean;
  setSimulationActive?: React.Dispatch<React.SetStateAction<boolean>>;
  onAnyStitchRendered?: () => void;
}

const StitchPhysics: React.FC<StitchPhysicsProps> = ({
  stitchesRef,
  setStitches,
  orientationParameters,
  simulationActive,
  setSimulationActive,
  onAnyStitchRendered,
}) => {
  const setRefsVersion = useState(0)[1];
  const [connections, setConections] = useState<Set<[number, number]> | null>(
    null
  );
  const frameNumber = useRef(0);
  const stitches = stitchesRef.current;

  const stitchRefs = useRef<React.RefObject<RapierRigidBody>[]>(
    stitches.map(() => React.createRef())
  );

  const colourRefs = useRef<React.MutableRefObject<Float32Array>[]>(
    stitches.map((stitch) => {
      const ref = React.createRef() as MutableRefObject<Float32Array>;
      if (!ref.current) {
        ref.current = new Float32Array([
          stitch.colour[0] / 255,
          stitch.colour[1] / 255,
          stitch.colour[2] / 255,
        ]);
      }
      return ref;
    })
  );

  useFrame(() => {
    if (onAnyStitchRendered && frameNumber.current === 0) {
      onAnyStitchRendered();
    }
    if (!setSimulationActive || !setStitches) return;
    if (frameNumber.current === 0) {
      setSimulationActive(true);
    }
    if (!simulationActive) return;
    frameNumber.current++;

    // Check velocities of all rigid bodies
    let totalMotion = 0;
    stitchRefs.current.forEach((stitchRef) => {
      const velocity = stitchRef.current?.linvel();
      const motionChange = velocity
        ? Math.abs(velocity.x) + Math.abs(velocity.y) + Math.abs(velocity.z)
        : 0;
      totalMotion += motionChange;
    });

    // Stop simulation if total motion is below a threshold
    const threshold = 0.6 * stitchRefs.current.length;
    if (totalMotion > threshold || frameNumber.current < 10) {
      return;
    }

    setSimulationActive(false);
    (async () => {
      const positions = stitchRefs.current.map((stitchRef) =>
        stitchRef.current!.translation()
      );
      const [colours, connections] = await colourNodes(
        positions,
        orientationParameters
      );
      setConections(connections);

      colourRefs.current.forEach((colourRef, i) => {
        colourRef.current.set(colours[i]!.map((c) => c / 255));
      });

      setStitches((stitches) =>
        stitches.map((stitch, i) => ({
          ...stitch,
          colour: colours[i]!,
          position: positions[i]!,
        }))
      );

      console.log("Colouring finished");
    })();
  });

  useEffect(() => {
    for (let i = stitchRefs.current.length; i < stitches.length; i++) {
      stitchRefs.current.push(React.createRef<RapierRigidBody>());
    }

    if (stitchRefs.current.length > stitches.length) {
      stitchRefs.current.splice(stitches.length);
    }

    stitches.forEach((stitch) => {
      const ref = stitchRefs.current[stitch.id];
      if (stitch.links.length <= 1) {
        if (ref && ref.current) {
          ref.current.setTranslation(stitch.position, false); // Update position
          ref.current.setBodyType(1, false);
        }
      } else {
        if (ref && ref.current) {
          ref.current.setBodyType(0, false);
        }
      }
    });

    setRefsVersion((v) => v + (1 % 1000));
  }, [stitches, setRefsVersion]);

  useEffect(() => {
    return () => {
      chevronTexture.dispose();
      geometry.dispose();
    };
  }, []);

  return (
    <React.Fragment>
      {stitches.map((stitch) => {
        const stitchRef = stitchRefs.current[stitch.id];

        if (!stitchRef) return null;
        return (
          <PointMass
            key={stitch.id}
            rigidBodyRef={stitchRef}
            position={stitch.position}
            fixed={stitch.links.length <= 1}
            visible={stitch.id > 0}
            colourRef={colourRefs.current[stitch.id]}
            chevronTexture={chevronTexture}
            geometry={geometry}
          />
        );
      })}
      {stitches.flatMap((stitch) =>
        stitch.links.map((link) => {
          const stitchRef = stitchRefs.current[stitch.id];
          const linkedStitchRef = stitchRefs.current[link];
          if (!stitchRef || !linkedStitchRef) return null;
          const stitchLength =
            stitch.id - link === 1
              ? adjacentStitchDistance
              : verticalStitchDistance;
          return (
            <Link
              key={`${stitch.id}-${link}`}
              bodyA={stitchRef}
              bodyB={linkedStitchRef}
              maxLength={stitchLength}
            />
          );
        })
      )}
      {connections &&
        Array.from(connections).map(([a, b]) => {
          if (a == b) {
            return null;
          }
          const stitchRef = stitchRefs.current[a];
          const linkedStitchRef = stitchRefs.current[b];

          if (!stitchRef || !linkedStitchRef) return null;
          const { x: x1, y: y1, z: z1 } = stitchRef.current!.translation();
          const {
            x: x2,
            y: y2,
            z: z2,
          } = linkedStitchRef.current!.translation();
          console.log(
            `Line between stitch ${a} at (${x1}, ${y1}, ${z1}) and stitch ${b} at (${x2}, ${y2}, ${z2})`
          );
          return (
            <Line
              key={`constellation-${a}-${b}`}
              points={[
                [x1, y1, z1],
                [x2, y2, z2],
              ]}
              color="floralwhite"
              lineWidth={1}
            />
          );
        })}
    </React.Fragment>
  );
};

export default StitchPhysics;
