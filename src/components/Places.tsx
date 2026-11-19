import React from "react";
import type { Stitch as HatStitch } from "../types/Stitch";
import type { SkyMarks } from "../types/SkyMarks";
import { regionCounts, regionInfo } from "../helpers/constellation-guide";

/** "Orion, the Hunter · 412 stitches of this hat, 9 of them stars": what a constellation is, and how much of the hat it has. */
export const PlaceNote: React.FC<{ hat: HatStitch[]; sky: SkyMarks; regionKey: string | undefined }> = ({
  hat,
  sky,
  regionKey,
}) => {
  const info = regionKey ? regionInfo(regionKey) : undefined;
  if (!info) return null;
  const count = regionCounts(hat, sky).find((one) => one.abbreviation === regionKey);
  return (
    <span className="place-note">
      <strong>{info.name}</strong>
      {info.meaning && <span>, {info.meaning}</span>}
      {count && (
        <span className="quiet">
          {" "}
          · {count.stitches.toLocaleString()} {count.stitches === 1 ? "stitch" : "stitches"} of this hat
          {count.stars > 0 && `, ${count.stars} of them ${count.stars === 1 ? "a star" : "stars"}`}, drawn round on the chart
        </span>
      )}
    </span>
  );
};

/** Beside the round and the stitch while knitting: the constellation whose sky you are knitting through. */
export const PlaceNow: React.FC<{ regionKey: string | undefined }> = ({ regionKey }) => {
  const info = regionKey ? regionInfo(regionKey) : undefined;
  if (!info) return null;
  return (
    <>
      <em className="knitting-place">{info.name}</em>
      <span className="quiet">{info.meaning || "the sky you are knitting"}</span>
    </>
  );
};
