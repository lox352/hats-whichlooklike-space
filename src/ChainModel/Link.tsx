/*
 * A rope joint between two stitches: they may come no further apart than the
 * yarn between them allows, and no closer than they like.
 */
import { useRopeJoint, RapierRigidBody } from "@react-three/rapier";

export default function Link({
  bodyA,
  bodyB,
  maxLength,
}: {
  bodyA: React.RefObject<RapierRigidBody>;
  bodyB: React.RefObject<RapierRigidBody>;
  maxLength: number;
}) {
  useRopeJoint(bodyA, bodyB, [
    [0, 0, 0], // Attach at the center of the fixed sphere
    [0, 0, 0], // Attach at the center of the movable sphere
    maxLength, // Maximum rope length
  ]);
  return null;
}
