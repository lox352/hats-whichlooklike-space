import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Stitch } from "../types/Stitch";
import { SkyMarks } from "../types/SkyMarks";
import { segmentsOf } from "../helpers/connections";
/** Follow the hat's curved surface, rather than burying straight chords in it. */
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
      const a = byId.get(from.stitch),
        b = byId.get(to.stitch);
      if (!a || !b) continue;
      const av = new THREE.Vector3(
          a.position.x,
          a.position.y,
          a.position.z,
        ).sub(centre),
        bv = new THREE.Vector3(b.position.x, b.position.y, b.position.z).sub(
          centre,
        );
      const ar = av.length(),
        br = bv.length();
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
      <lineBasicMaterial color="#c9a961" toneMapped={false} />
    </lineSegments>
  );
}
