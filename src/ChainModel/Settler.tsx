import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RapierRigidBody,useRapier } from "@react-three/rapier";
import { settleStepBudgetMs,settleSubsteps,settleTimeStep } from "../constants";
import { createRestDetector,SettleMetrics } from "../helpers/settling";
import { Point } from "../types/Point";
interface Props{active:boolean;stitchRefs:React.MutableRefObject<React.RefObject<RapierRigidBody>[]>;onSettled:(positions:Point[],metrics:SettleMetrics)=>void}
export default function Settler({active,stitchRefs,onSettled}:Props){
 const {step}=useRapier();const rest=useRef(createRestDetector());const complete=useRef(false),count=useRef(0),started=useRef(0);
 useFrame(()=>{if(!active||complete.current||stitchRefs.current.some(r=>!r.current))return;if(!started.current)started.current=performance.now();const deadline=performance.now()+settleStepBudgetMs;
 for(let i=0;i<settleSubsteps;i++){step(settleTimeStep);count.current++;let motion=0;for(const ref of stitchRefs.current){const v=ref.current!.linvel();motion+=Math.abs(v.x)+Math.abs(v.y)+Math.abs(v.z);}const meanMotion=motion/stitchRefs.current.length;
 if(rest.current(meanMotion)){complete.current=true;const positions=stitchRefs.current.map(r=>r.current!.translation());onSettled(positions,{steps:count.current,wallMs:performance.now()-started.current,height:Math.max(...positions.map(p=>p.y)),meanMotion});break;}
 if(performance.now()>=deadline)break;
 }});return null;
}
