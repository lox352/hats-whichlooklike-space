import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { readPattern, patternsChangedEvent, setProgress, percentComplete } from "../helpers/pattern-storage";
import PatternContents from "./PatternContents";
import KnittingMode from "./KnittingMode";
import Button from "./ui/Button";
export default function SavedPattern() {
 const {patternId}=useParams();
 const [params,setParams]=useSearchParams();
 const knitting=params.get("knitting")==="1";
 const [pattern,setPattern]=useState(()=>readPattern(patternId));
 const [undo,setUndo]=useState<number[]>([]);
 const [problem,setProblem]=useState("");
 useEffect(()=>{const refresh=()=>setPattern(readPattern(patternId));refresh();window.addEventListener(patternsChangedEvent,refresh);window.addEventListener("storage",refresh);return ()=>{window.removeEventListener(patternsChangedEvent,refresh);window.removeEventListener("storage",refresh);};},[patternId]);
 const update=(next:number,record=true)=>{if(!pattern)return;const result=setProgress(pattern.id,next);if(result?.ok){if(record)setUndo([...undo.slice(-99),pattern.progress]);setProblem("");}else setProblem("Could not save progress. Storage may be full.");};
 if(!pattern)return <main className="page"><h1>Pattern not found</h1><p>Saved patterns live in the browser where you made them.</p><a href="#/">Back to your hats</a></main>;
 return <main className="page"><a href="#/" className="eyebrow">Your hats</a><h1>{pattern.name??"Saved sky"}</h1><p>{percentComplete(pattern).toFixed(1)}% knitted</p>
 <PatternContents stitches={pattern.stitches} sky={pattern.sky} progress={pattern.progress} name={pattern.name??"Sky chart"} followProgress={knitting}/>
 <p role="alert">{problem}</p>
 {!knitting && <Button onClick={()=>setParams({knitting:"1"},{replace:true})}>{pattern.progress?"Keep knitting":"Start knitting"}</Button>}
 {knitting && <KnittingMode stitches={pattern.stitches} progress={pattern.progress} setProgress={update} onStop={()=>setParams({},{replace:true})} canUndo={undo.length>0} onUndo={()=>{const last=undo[undo.length-1];if(last!==undefined){update(last,false);setUndo(undo.slice(0,-1));}}}/>}
 </main>;
}
