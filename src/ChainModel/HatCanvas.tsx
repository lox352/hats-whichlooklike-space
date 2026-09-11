import { lazy,Suspense } from "react";
import type { ChainModelProps } from "./ChainModel";
const ChainModel=lazy(()=>import('./ChainModel'));
export default function HatCanvas(props:ChainModelProps){return <Suspense fallback={<p className="canvas-loading" role="status">Preparing the sky…</p>}><ChainModel {...props}/></Suspense>;}
