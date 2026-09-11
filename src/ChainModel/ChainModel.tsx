import React, { useEffect, useRef } from "react";
import { Stitch } from "../types/Stitch";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import StitchPhysics from "./StitchPhysics";
import * as THREE from "three";
import { verticalStitchDistance } from "../constants";
import { defaultOrientationParameters, OrientationParameters } from "../types/OrientationParameters";
import { SkyMarks } from "../types/SkyMarks";

interface ChainModelProps {
  stitches: Stitch[];
  setStitches?: React.Dispatch<React.SetStateAction<Stitch[]>>;
  sky: SkyMarks;
  setSky?: (sky: SkyMarks) => void;
  orientationParameters?: OrientationParameters;
  simulationActive: boolean;
  setSimulationActive?: React.Dispatch<React.SetStateAction<boolean>>;
  onAnyStitchRendered?: () => void;
}

const ChainModel: React.FC<ChainModelProps> = ({
  stitches,
  setStitches,
  sky,
  setSky,
  orientationParameters = defaultOrientationParameters,
  simulationActive,
  setSimulationActive,
  onAnyStitchRendered,
}) => {
  const stitchesRef = useRef(stitches);
  const stitchesPerRow = stitches.filter(stitch => stitch.fixed).length;
  const roughHeight = verticalStitchDistance * stitches.length / stitchesPerRow;

  useEffect(() => {
    return () => {
      console.log("ChainModel has unmounted");
    };
  }, []);

  return (
    <Canvas
      camera={{ position: [-4 * stitchesPerRow / 5, roughHeight / 2, 0] }}
      style={{ backgroundColor: "rgb(20, 20, 20)" }}
      shadows={"basic"}
    >
      <OrbitControls target={new THREE.Vector3(0, 5 * roughHeight / 12, 0 )} enabled={!simulationActive} />
      <Physics
        gravity={[0, 9.81, 0]}
        timeStep="vary"
        numSolverIterations={20}
        paused={!simulationActive}
      >
        <StitchPhysics
          stitchesRef={stitchesRef}
          setStitches={setStitches}
          sky={sky}
          setSky={setSky}
          orientationParameters={orientationParameters}
          simulationActive={simulationActive}
          setSimulationActive={setSimulationActive}
          onAnyStitchRendered={onAnyStitchRendered}
        />
      </Physics>
    </Canvas>
  );
};

export default ChainModel;
