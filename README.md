# Hats which look like space

Turn a place and moment into a knittable night sky. Knit with Night, Milky Way and Star yarns, then embroider the constellation lines.

## Development

Run `npm ci`, then `npm run dev`. Validate with `npm test`, `npm run build` and `npm run lint`.

This is the independent space branch. Earth shares the knitting fundamentals but uses a different projection and repository. Push explicitly with `git push space HEAD:refs/heads/space`; the GitHub Pages workflow deploys that branch.

## Projection and saved patterns

Stars are matched to stitches using spherical nearest-neighbour search. This corrects the old distortion near the pole and longitude seam, so newly generated charts differ from older charts. Saved charts retain their stored geometry and constellation links through a versioned local-storage migration.

The sky catalogue uses J2000 coordinates without precession. Time-zone polygons describe standard offsets; daylight-saving time is not inferred. Saved patterns live in this browser, not an account.

## Work in progress

See `PROGRESS.md` for checkpoints and verification. Embroidery is scheduled after the rendering and motion work.
