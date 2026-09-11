import React from "react";
import "./FinishedBanner.css";

interface FinishedBannerProps {
  /** Total knittable stitches in the hat. */
  stitches: number;
  /** Whether the constellation lines have all been sewn as well. */
  sewn: boolean;
}

/**
 * Shown when a pattern reaches its last stitch, and again when the last line
 * is sewn.
 *
 * Finishing several thousand stitches of colourwork deserves more than the
 * percentage quietly reading 100. It names the number, because that is the
 * part worth being told - and then says what comes next, because on this hat
 * the knitting is only half the make.
 */
const FinishedBanner: React.FC<FinishedBannerProps> = ({ stitches, sewn }) =>
  sewn ? (
    <div className="finished" role="status">
      <h2 className="finished-title">The sky, and every line across it.</h2>
      <p className="finished-text">
        {stitches.toLocaleString()} stitches knitted and the constellations
        sewn on. That is the whole night, done.
      </p>
    </div>
  ) : (
    <div className="finished" role="status">
      <h2 className="finished-title">You knitted the whole sky.</h2>
      <p className="finished-text">
        {stitches.toLocaleString()} stitches, and a star on every one that
        had one over it. Now the constellations: sew the lines that join them.
      </p>
    </div>
  );

export default FinishedBanner;
