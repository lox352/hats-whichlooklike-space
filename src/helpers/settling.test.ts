// @vitest-environment node
import { beforeAll,expect,it } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";
import { getStitches } from "./stitches";
import { createRestDetector } from "./settling";
import { settleTimeStep,settleDamping,solverIterations,adjacentStitchDistance,verticalStitchDistance } from "../constants";
import { predictHatShape } from "./hat-shape";
import { colourNodes } from "./node-colouring";
import { buildSkyIndex,toUnitVector } from "./sky-index";
import { getGlobalCoordinates,rotateToDestination } from "./sky-geometry";
import { projectCatalogue,catalogueStar } from "./star-colouring";
import { defaultOrientationParameters } from "../types/OrientationParameters";
import { writeFileSync } from "node:fs";
import measurements from "./space-hat-measurements.json";
import { env } from "node:process";
beforeAll(()=>RAPIER.init());
function settle(count:number,rows:number,batch:number){const stitches=getStitches(count,rows,'Pyramidal');const world=new RAPIER.World({x:0,y:9.81,z:0});world.timestep=settleTimeStep;world.numSolverIterations=solverIterations;const bodies=stitches.map(s=>{const desc=(s.links.length<=1?RAPIER.RigidBodyDesc.fixed():RAPIER.RigidBodyDesc.dynamic()).setTranslation(s.position.x,s.position.y,s.position.z).setLinearDamping(settleDamping).setAngularDamping(settleDamping);const body=world.createRigidBody(desc);world.createCollider(RAPIER.ColliderDesc.ball(.02).setCollisionGroups(2),body);return body;});for(const s of stitches)for(const link of s.links)world.createImpulseJoint(RAPIER.JointData.rope(s.id-link===1?adjacentStitchDistance:verticalStitchDistance,{x:0,y:0,z:0},{x:0,y:0,z:0}),bodies[s.id],bodies[link],true);
 const rest=createRestDetector();let done=false,steps=0;const start=performance.now();while(!done&&steps<1500){for(let n=0;n<batch;n++){world.step();steps++;const mean=bodies.reduce((sum,b)=>{const v=b.linvel();return sum+Math.abs(v.x)+Math.abs(v.y)+Math.abs(v.z);},0)/bodies.length;if(rest(mean)){done=true;break;}}}const positions=bodies.map(b=>b.translation());const height=Math.max(...positions.map(p=>p.y));world.free();return {stitches,positions,steps,height,done,wallMs:performance.now()-start,predicted:predictHatShape(stitches).height};}
it('settles to identical positions regardless of frame batching',()=>{const a=settle(40,8,1),b=settle(40,8,5);expect(a.done).toBe(true);expect(b.steps).toBe(a.steps);expect(b.positions).toEqual(a.positions);},30000);
it('matches every catalogue star against a brute-force search on a real settled hat',()=>{const hat=settle(80,20,2);expect(hat.done).toBe(true);const orientation=defaultOrientationParameters;const coordinates=hat.positions.map(p=>rotateToDestination(getGlobalCoordinates(p,hat.height),orientation));const vectors=coordinates.map(toUnitVector),index=buildSkyIndex(coordinates);for(const star of projectCatalogue(index)){const vector=catalogueStar(star.hip)!.vector;let best=-Infinity;for(const v of vectors)best=Math.max(best,v[0]*vector[0]+v[1]*vector[1]+v[2]*vector[2]);expect(star.cosine).toBeCloseTo(best,12);}const sky=colourNodes(hat.positions,orientation);expect(sky.sky.stars.length).toBeGreaterThan(20);},30000);
it.skipIf(!env.SPACE_MEASURE)('records space hat dimensions',()=>{const data=[[80,20],[130,25],[160,35],[200,45]].map(([count,rows])=>{const result=settle(count,rows,2);expect(result.done).toBe(true);return {count,rows,steps:result.steps,height:result.height,predicted:result.predicted,wallMs:result.wallMs,totalRows:predictHatShape(result.stitches).rows,radius:predictHatShape(result.stitches).radius};});writeFileSync('src/helpers/space-hat-measurements.json',JSON.stringify(data,null,2)+'\n');console.log(data);},120000);

it("frames the measured space hats within a 2.5% height margin",()=>{for(const m of measurements){const predicted=predictHatShape(getStitches(m.count,m.rows,"Pyramidal")).height;expect(Math.abs(predicted/m.height-1)).toBeLessThan(.025);}});
