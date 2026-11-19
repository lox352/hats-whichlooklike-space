import "./App.css";
import "./components/Print.css";
import { HashRouter, Route, Routes } from "react-router-dom";
import { YarnProvider } from "./YarnContext";
import Home from "./components/Home";
import Design from "./components/Design";
import Render from "./components/Render";
import Pattern from "./components/Pattern";
import SavedPattern from "./components/SavedPattern";
import KnitChart from "./components/KnitChart";
import SavedRender from "./components/SavedRender";
export default function App() {
  return (
    <YarnProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/design" element={<Design />} />
          <Route path="/render" element={<Render />} />
          <Route path="/render/:patternId" element={<SavedRender />} />
          <Route path="/pattern" element={<Pattern />} />
          <Route path="/pattern/:patternId" element={<SavedPattern />} />
          <Route path="/pattern/:patternId/chart" element={<KnitChart />} />
        </Routes>
      </HashRouter>
    </YarnProvider>
  );
}
