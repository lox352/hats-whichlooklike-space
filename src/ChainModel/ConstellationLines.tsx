import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Stitch } from "../types/Stitch";
import { SkyMarks } from "../types/SkyMarks";
import { segmentsOf } from "../helpers/connections";
/**
 * The constellation figures on the settled hat, as one set of line segments.
 *
 * A straight line between two stitches on a dome runs through the wool, so
 * each line is drawn as a short arc instead: points interpolated on the
 * sphere the hat approximates, lifted a stitch's width off the surface, so
 * the figure lies on the hat the way the thread will. Lines that run off the
 * brim have nowhere to go in three dimensions and are left out.
 *
 * One LineSegments for the lot - a single draw call - rather than a drei Line
 * per segment, which had been several hundred objects each with its own
 * material.
 */
export default function ConstellationLines({
  stitches,
  sky,
}: {
  stitches: Stitch[];
  sky: SkyMarks;
}) {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const centre = new THREE.Vector3(
      0,
      Math.max(...stitches.map((s) => s.position.y)) / 2,
      0,
    );
    const byId = new Map(stitches.map((s) => [s.id, s]));
    for (const { from, to } of segmentsOf(sky)) {
      if (from.offHat || to.offHat || from.stitch === to.stitch) continue;
      const a = byId.get(from.stitch);
      const b = byId.get(to.stitch);
      if (!a || !b) continue;
      const av = new THREE.Vector3(a.position.x, a.position.y, a.position.z).sub(centre);
      const bv = new THREE.Vector3(b.position.x, b.position.y, b.position.z).sub(centre);
      const ar = av.length();
      const br = bv.length();
      av.normalize();
      bv.normalize();
      const at = (t: number) =>
        av
          .clone()
          .lerp(bv, t)
          .normalize()
          .multiplyScalar(ar + (br - ar) * t + 1)
          .add(centre);
      for (let n = 0; n < 16; n++) points.push(at(n / 16), at((n + 1) / 16));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [stitches, sky]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineSegments geometry={geometry}>
      {/* Gold leaf, and not tone-mapped, so it stays gold under any light. */}
      <lineBasicMaterial color="#c9a961" toneMapped={false} />
    </lineSegments>
  );
}
