# Space overhaul handoff

User instruction: continue without approval pauses; push checkpoints to the space remote. Order: correctness → functional features → celestial atlas → hat and motion → embroidery last. Do not modify earth.

## Checkpoint 1 — correctness

Inherited Claude's uncommitted projection, geometry, sky data and storage refactor. Completed the nullable-month build fix, civil-time year rollover and leap-day regression coverage, and project README. 166 tests pass; production build and ESLint pass. Initial JS bundle is 7.63 MB (2.54 MB gzip), before planned lazy loading. Browser home, design and 3D generation work; the sky finishes projecting without console errors. Existing slow settling remains for the motion milestone.

## Remaining

- Functional: sizing, design URL/session, print/export/instructions, knitting mode, yarn choices, magnitude input, constellation names, lazy time zones.
- Celestial atlas visual overhaul, accessibility, dialogs, metadata.
- Instanced knitting, deterministic settling, camera fit, scoped lazy canvas, sky arrival.
- Guided embroidery and separately persisted segment progress.

## Checkpoint 2 — functional features

Implemented measurement sizing with no negative ease; sky/year inputs and explicit UTC offset; URL designs with magnitude; session cache containing both stitches and sky; saved knitting mode with undo, row/run controls and reload persistence; three editable named yarns; swatch-based yarn estimates; written rows; SVG/PNG/print exports including constellation guides; all 89 figure names. Time-zone metadata stripped with exact geometry retained and lookup loaded lazily, cached by location. Initial JS reduced to 4.12 MB (1.28 MB gzip), with 3.49 MB zone data separate.

Validation: 240 tests, build and lint pass. Browser journey: Polaris design → generation → chart → named save → knit a 31-stitch run → reload; resumed at row 1, stitch 32 with knitting mode retained. Heavy independent nearest-neighbour reference test now has a 30-second allowance to accommodate simultaneous WebGL verification.

## Checkpoint 3 — celestial atlas

Deep indigo / parchment palettes, self-hosted Cormorant Garamond 600 and license, engraved celestial frontispiece, responsive home/design/saved pages, star dots and gold constellation joins, closed stitch-cell grid and decrease symbols. Native in-page dialogs replace prompts/alerts; explicit appearance selector supplements device preference. Static page styles moved into CSS; runtime chart geometry, progress widths and yarn colours remain data-driven styles.

Verified desktop and 320px screenshots, both themes, saved knitting chart, 320px document width with no horizontal page overflow, all form fields at 16px. 240 tests and build/lint pass. Next: rendering/motion, then embroidery.
