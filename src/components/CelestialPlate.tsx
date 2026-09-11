import React from "react";
import "./CelestialPlate.css";

/*
 * An engraved plate: the frontispiece of the atlas.
 *
 * Concentric declination circles, an ecliptic and an equator drawn as
 * ellipses, the cardinal points, and one figure - the Plough - picked out in
 * gold with a punched star at each vertex. All line-work, so it costs
 * nothing to load and takes the ink colour of whichever plate it sits on.
 */
const figure: [number, number][] = [
  [146, 152],
  [195, 182],
  [245, 215],
  [290, 190],
  [350, 226],
  [329, 311],
  [284, 348],
  [217, 277],
  [167, 311],
  [260, 301],
];

const CelestialPlate: React.FC<{ className?: string }> = ({ className }) => (
  <figure className={["celestial-plate", className].filter(Boolean).join(" ")}>
    <svg viewBox="0 0 500 500" aria-hidden="true">
      <defs>
        <pattern
          id="plate-engraving"
          width="5"
          height="5"
          patternTransform="rotate(35)"
          patternUnits="userSpaceOnUse"
        >
          <path d="M0 0V5" stroke="currentColor" strokeWidth="0.4" />
        </pattern>
      </defs>
      <circle cx="250" cy="250" r="230" fill="url(#plate-engraving)" opacity=".22" />
      <circle cx="250" cy="250" r="222" />
      <circle cx="250" cy="250" r="207" />
      <circle cx="250" cy="250" r="180" />
      <ellipse cx="250" cy="250" rx="100" ry="180" />
      <ellipse cx="250" cy="250" rx="180" ry="75" />
      <path
        d="M30 250H470M250 30V470M110 110L390 390M110 390L390 110"
        opacity=".3"
      />
      <g className="plate-figure">
        <path d="M146 152L195 182L245 215L290 190L350 226L329 311L284 348M245 215L217 277L167 311M217 277L260 301L329 311" />
        {figure.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={i % 3 === 0 ? 5 : 3} />
            <path d={`M${x - 9} ${y}h18M${x} ${y - 9}v18`} opacity=".55" />
          </g>
        ))}
      </g>
      <text x="250" y="19">N</text>
      <text x="481" y="254">E</text>
      <text x="250" y="492">S</text>
      <text x="18" y="254">W</text>
    </svg>
    <figcaption>The sky becomes the stitch</figcaption>
  </figure>
);

export default CelestialPlate;
