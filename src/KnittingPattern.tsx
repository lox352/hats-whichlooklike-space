import { useEffect, useMemo } from "react";
import { Stitch } from "./types/Stitch";
import { SkyMarks } from "./types/SkyMarks";
import { segmentsOf } from "./helpers/connections";
import { layOutStitches } from "./helpers/pattern-layout";
import { stitchMarkPath } from "./helpers/stitch-marks";
import { useYarns } from "./useYarns";
import { cssColour, displayYarn } from "./helpers/yarn-preference";
import { SkyPalette } from "./helpers/sky-palette";
import "./KnittingPattern.css";
interface Props {stitches:Stitch[];sky:SkyMarks;progress:number;followProgress?:boolean;activeSegment?:string;sewnSegments?:string[]}
export default function KnittingPattern({stitches,sky,progress,followProgress,activeSegment,sewnSegments=[]}:Props) {
 const {yarns}=useYarns();
 const charted=useMemo(()=>stitches.filter(s=>s.id>0),[stitches]);
 const {positions,numRows,numCols}=useMemo(()=>layOutStitches(charted),[charted]);
 const stars=useMemo(()=>new Set(sky.stars),[sky]);
 const connections=useMemo(()=>segmentsOf(sky),[sky]);
 useEffect(()=>{if(!followProgress)return;const cell=document.getElementById(`stitch-${progress+1}`);if(!cell)return;const rect=cell.getBoundingClientRect();const panel=document.querySelector('.knitting-panel')?.getBoundingClientRect();const bottom=(panel?.top??window.innerHeight)-50; if(rect.bottom>bottom||rect.top<70)window.scrollBy({top:rect.top-bottom+70,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});cell.scrollIntoView({block:'nearest',inline:'nearest'});},[progress,followProgress]);
 return <div className="chart-scroll" tabIndex={0} aria-label="Knitting chart. Scroll sideways to see all stitches."><div className="knitting-pattern-container" style={{width:(numCols+2)*10,height:(numRows+2)*10,gridTemplateRows:`repeat(${numRows+2},10px)`,gridTemplateColumns:`repeat(${numCols+2},10px)`}}>
 {charted.map(s=>{const pos=positions[s.id];if(!pos)return null;const star=stars.has(s.id);const colour=displayYarn(s.colour,yarns).colour;const path=stitchMarkPath(s.type,0,0,10);return <div key={s.id} id={`stitch-${s.id}`} className={`stitch-box${s.id<=progress?' stitch-done':''}${s.id===progress+1&&followProgress?' stitch-current':''}${(1-pos.col)%5===0?' grid-five-col':''}${(1-pos.row)%5===0?' grid-five-row':''}`} style={{gridRow:numRows+pos.row,gridColumn:numCols+pos.col,backgroundColor:cssColour(star?displayYarn(SkyPalette.Night,yarns).colour:colour)}}>
 {star&&<span className="star-dot" style={{backgroundColor:cssColour(colour)}}/>}{path&&<svg className="stitch-symbol" viewBox="0 0 10 10" aria-hidden="true"><path d={path}/></svg>}</div>;})}
 {Array.from({length:numCols},(_,i)=>i+1).filter(n=>n%5===0).map(n=><span key={`c${n}`} className="grid-label" style={{gridRow:numRows+1,gridColumn:numCols-n+1}}>{n}</span>)}
 {Array.from({length:numRows},(_,i)=>i+1).filter(n=>n%5===0).map(n=><span key={`r${n}`} className="grid-label" style={{gridRow:numRows-n+1,gridColumn:numCols+1}}>{n}</span>)}
 <svg className="connection-svg" width={numCols*10} height={numRows*10} aria-hidden="true">{connections.map(({abbreviation,strokeIndex,segmentIndex,from,to})=>{
  const a=positions[from.stitch],b=positions[to.stitch];if(!a||!b)return null;
  let x1=(numCols+a.col-.5)*10,x2=(numCols+b.col-.5)*10;const y1=(from.offHat?numRows-a.row+.5:numRows+a.row-.5)*10,y2=(to.offHat?numRows-b.row+.5:numRows+b.row-.5)*10;const wrap=numCols*10;
  if(Math.abs(x2-x1)>wrap/2){if(x1<x2)x1+=wrap;else x2+=wrap;}
  const key=`${abbreviation}:${strokeIndex}:${segmentIndex}`;const status=key===activeSegment?'active':sewnSegments.includes(key)?'sewn':'pending';
  return <g key={key} className={`constellation-line ${status}${activeSegment&&status==='pending'?' dimmed':''}${from.offHat||to.offHat?' off-hat':''}`} data-segment={key}>{[0,-wrap].map(shift=><line key={shift} x1={x1+shift} y1={y1} x2={x2+shift} y2={y2}/>)}</g>;
 })}</svg></div></div>;
}
