import "./App.css";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./components/Home";
import Design from "./components/Design";
import Render from "./components/Render";
import { useState } from "react";
import { Stitch } from "./types/Stitch";
import Pattern from "./components/Pattern";
import SavedPattern from "./components/SavedPattern";
import SavedRender from "./components/SavedRender";
import { defaultOrientationParameters } from "./types/OrientationParameters";
import { emptySky, SkyMarks } from "./types/SkyMarks";

function App() {
  const [stitches, setStitches] = useState<Stitch[]>([]);
  const [sky, setSky] = useState<SkyMarks>(emptySky);
  const [orientationParameters, setOrientationParameters] = useState(
    defaultOrientationParameters
  );

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/design"
          element={
            <Design
              setStitches={setStitches}
              orientationParameters={orientationParameters}
              setOrientationParameters={setOrientationParameters}
            />
          }
        />
        <Route
          path="/render"
          element={
            <Render
              stitches={stitches}
              setStitches={setStitches}
              sky={sky}
              setSky={setSky}
              orientationParameters={orientationParameters}
            />
          }
        />
        <Route path="/render/:patternId" element={<SavedRender />} />
        <Route path="/pattern" element={<Pattern stitches={stitches} sky={sky} />} />
        <Route path="/pattern/:patternId" element={<SavedPattern />} />
      </Routes>
    </Router>
  );
}

export default App;
