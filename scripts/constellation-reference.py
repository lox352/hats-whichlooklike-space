"""Regenerate the constellation-region reference data.

Optional; the outputs are committed. Needs `pip install astropy numpy`.

The IAU boundaries were drawn in the equinox of 1875, so a J2000 direction
has to be precessed back before it is looked up. This writes the fixed
rotation for that (src/data/j2000-to-b1875.json) and a grid of reference
points classified by Astropy's own implementation of Roman's table
(src/helpers/__fixtures__/constellation-regions.json), which the tests
compare the app's lookup against. Both are mean coordinates: no nutation
or aberration, since neither the catalogue nor the boundaries carry them.
"""
import json
from pathlib import Path

import astropy
import astropy.units as u
from astropy.coordinates import FK5, PrecessedGeocentric, SkyCoord, get_constellation

root = Path(__file__).resolve().parents[1]
source = FK5(equinox="J2000")
target = FK5(equinox="B1875")

basis = SkyCoord(
    x=[1, 0, 0], y=[0, 1, 0], z=[0, 0, 1],
    representation_type="cartesian", frame=source,
)
matrix = basis.transform_to(target).cartesian.xyz.value.tolist()
(root / "src/data/j2000-to-b1875.json").write_text(json.dumps(matrix, indent=2) + "\n")

points = [(ra, dec) for dec in range(-87, 88, 3) for ra in range(0, 360, 5)]
points += [(0, 90), (0, -90), (359.999, 0), (0.001, 0)]
coords = SkyCoord(
    ra=[p[0] for p in points] * u.deg,
    dec=[p[1] for p in points] * u.deg,
    frame=source,
).transform_to(target)
boundary_coords = SkyCoord(
    ra=coords.ra, dec=coords.dec, frame=PrecessedGeocentric(equinox="B1875")
)
names = get_constellation(boundary_coords, short_name=True)
result = {
    "source": (
        f"Astropy {astropy.__version__}: FK5 J2000 to mean B1875, then "
        "get_constellation on boundary coordinates (Roman 1987)"
    ),
    "points": [[ra, dec, str(name)] for (ra, dec), name in zip(points, names)],
}
(root / "src/helpers/__fixtures__/constellation-regions.json").write_text(
    json.dumps(result, separators=(",", ":")) + "\n"
)
print(f"{len(points)} reference points, {len(set(names))} constellations")
