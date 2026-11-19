# Hats Which Look Like Space

A long exposure of the sky you stood under, knitted into a hat: say where you
were and when, and get a chart you can actually knit from and a guide to trace
the constellations from. Live at
[hats.whichlooklike.space](https://hats.whichlooklike.space).

The site is styled as a deep-sky photograph. The three steps are named as a
photograph is made - *frame* the sky, *expose* it onto the hat, and take away
the *print* - and the design lives in `src/index.css`: one dark ground with a
star field behind it, one variable face (Manrope), and a warm accent that
blooms. There is no light theme; the print sheet is the only place ink goes
on white.

## How it works

The colourwork is not drawn — it is *derived*, by simulating the hat as a
physical object and then asking which star each stitch ends up under. Unlike
its sibling `earth`, which samples a map per stitch, this branch walks the
star catalogue and puts each star on the stitch nearest it.

1. **Frame** (`src/components/Design.tsx`) — choose a head size and gauge (the
   stitch count follows from them), then which sky: the sky over a place on a
   night, Polaris, the Southern Cross, or a point by right ascension and
   declination. A night and a place become a point overhead through the
   place's time zone (`src/helpers/time-zone-helper.ts`, loaded lazily) and
   sidereal time (`src/helpers/celestial-coordinates.ts`).
2. **Knit** (`src/types/KnittingMachine.ts`) — a virtual knitting machine casts
   on, joins the round, knits the body and works the decreases, emitting a
   `Stitch[]` where each stitch records the stitches it was knitted into. The
   knitting is a helix, not a stack of closed rings, so rows wrap at a seam.
3. **Settle** (`src/ChainModel/`) — every stitch becomes a Rapier rigid body,
   linked to its neighbours by rope joints. Gravity points *up*, so the tube
   relaxes into a hat shape. The simulation is stepped deterministically so
   the settled shape does not depend on the machine.
4. **Chart the sky** (`src/helpers/star-colouring.ts`) — once the simulation
   comes to rest, each stitch's resting position is turned into a direction,
   the sky is rotated so the chosen point lands where asked, and every
   catalogue star is put on its nearest stitch by great-circle distance
   (`src/helpers/sky-index.ts`). The constellation figures are resolved to
   their stars and joined up as strokes; a stitch a figure passes through is
   always a star. The hat is knitted in three yarns: Night, Milky Way, Star.
5. **Print** (`src/helpers/pattern-layout.ts`) — the tube is flattened into a
   grid with decrease symbols and the constellation lines drawn over it. It can
   be saved, ticked off row by row while knitting, and then traced line by
   line while embroidering (`src/helpers/embroidery.ts`).

The hat is treated as a sphere all the way down, so the brim is a horizon
rather than a south pole; that is what the sky wants and what every charted
hat has had.

## The knitting machinery

Everything that reads a pattern while it is knitted is
[Sweat Shop](https://github.com/lox352/sweat-shop)'s, which grew out of
these sites and took them a long way further for jumpers. It is copied in,
file for file, as it is on `earth`, so it can be copied in again as it
moves on:

| Folder | What it is |
| --- | --- |
| `src/pattern/` | A stitch and the table of the kinds of stitch and step, which everything reads. |
| `src/reading/` | What is read off the knitting: the chart's layout, the rounds as counted, runs, the key, yardage. |
| `src/ui/chart/` | The chart: painted on canvas tiles, columns no stitch in view needs closed up, pinch to zoom, gliding after the stitch, a tapped stitch's bubble, and lines from star to star over it. |
| `src/ui/components/` | The knitting panel, the key, the time a hat has taken and has left. |
| `src/projects/` | Settings, and the knitting-time log kept from every tap. |

The hat is still framed, settled and charted as it always was.
`src/knitting/` is where the two meet: `hat-knitting.ts` reads a hat's
stitches as Sweat Shop reads a jumper's - the cast-on cast on and the join a
step of its own after it, the double decrease the s2kp it always was, rounds
counted from the cast-on, each yarn a slot letter - and the rest of
`src/knitting/` is the hat's own: its yarns, what it says of its stitches,
the constellations (`places.ts`: a stitch's region, and the figures as
lines on the chart), its wool, the chart as printed. The sky keeps the
hat's own stitch ids; the knitting's run one past them after the join.

Tracing the figures is `components/EmbroideryPanel.tsx`, built as the
knitting panel is, under the same chart with the line in hand picked out.

Saved patterns are on version 4, which counts progress in the knitting's
ids, with the join a step; older ones are moved on as they are read.

The machinery's stylesheets are written for paper; `index.css` names this
site's sky as its paper (`--paper`, `--paper-raised`...). What changed in
the copied files is as on `earth`: see its README.

The pages:

| Address | What it is |
| --- | --- |
| `/pattern/:id` | A saved sky: its knitting and tracing, the chart at the needle, its time and its wool. |
| `/pattern/:id/chart` | The chart, filling the screen. With `?knitting=1` the knitting panel is open, with `?embroidery=1` the embroidery panel; with `?stats=1`, your time is painted over it. |

## Running it

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm test` | Vitest unit tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | ESLint |
| `npm run preview` | Serve the production build |

The settle's fitted constants come from measured hats; re-measure with
`SPACE_MEASURE=1 npm test -- src/helpers/settling.test.ts` (about ninety
seconds) if the physics tuning changes.

## Deployment

Pushing to the `space` branch triggers `.github/workflows/deploy.yml`, which
runs the tests, builds, and publishes to the `gh-pages` branch. **A push to
`space` is a production deploy.** The remote is named `space`; push with
`git push space HEAD:refs/heads/space`, since `space` is also a local branch
name and is ambiguous on its own.

## Notes

- Saved patterns live in `localStorage` on the device that made them. All
  reads and writes go through `src/helpers/pattern-storage.ts`, which versions
  the stored shape and migrates older entries on read — including patterns
  saved before the sky was stored beside the stitches — so a corrupt or
  outdated entry cannot break the pages that list them.
- The star catalogue (`src/assets/stars.6.json`) is d3-celestial's, to
  magnitude 6, in J2000 coordinates; no precession is applied, which is under
  a sixth of a stitch. Constellation lines are the IAU figures, 89 of them
  because Serpens is in two parts. Every stitch is also labelled with the
  IAU constellation region its sky is in (`src/helpers/constellation-regions.ts`):
  the J2000 direction is precessed to 1875 and looked up in Roman's table of
  the boundaries, checked against Astropy at four thousand points by
  `scripts/constellation-reference.py`. Time-zone boundaries are from
  OpenStreetMap, © OpenStreetMap contributors. Daylight saving is the
  zone's business: a clock time the clocks repeated is taken the first time
  round and one they skipped is carried forward, and the frame page says so.
- Sibling branches build the same machinery for different subjects: `earth`
  (a map of the world) and `pictures`.
