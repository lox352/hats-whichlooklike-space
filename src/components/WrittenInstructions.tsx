import { useMemo,useState } from "react";
import { Stitch } from "../types/Stitch";
import { instructionsToText,writtenInstructions } from "../helpers/written-instructions";
import { displayYarn } from "../helpers/yarn-preference";
import { useYarns } from "../useYarns";
import Button from "./ui/Button";
export default function WrittenInstructions({stitches}:{stitches:Stitch[]}) {
 const [open,setOpen]=useState(false),[message,setMessage]=useState('');const {yarns}=useYarns();
 const rows=useMemo(()=>open?writtenInstructions(stitches):[],[open,stitches]);
 return <section><Button variant="quiet" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Hide written instructions':'Written instructions'}</Button>{open&&<div className="written-instructions"><p>Row 1 is the cast-on. Read each round from right to left. Knit the colourwork first, then embroider the connecting lines.</p><p>k2tog: knit two together. s2kp: slip two together knitwise, knit one, then pass both slipped stitches over. Join the cast-on in the round without twisting; after the final round, draw yarn through the remaining stitches and secure.</p><Button variant="quiet" onClick={async()=>{try{await navigator.clipboard.writeText(instructionsToText(stitches,c=>displayYarn(c,yarns).name));setMessage('Copied.');}catch{setMessage('Could not copy. Select the rows below instead.');}}}>Copy all rows</Button><p role="status">{message}</p><ol>{rows.map(r=><li key={r.row}><strong>Row {r.row} ({r.stitches} sts)</strong><span>{r.segments.map(s=>`${s.text} ${displayYarn(s.colour,yarns).name}`).join(', ')}</span></li>)}</ol></div>}</section>;
}
