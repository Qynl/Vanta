import RAPIER from "@dimforge/rapier3d-compat";

import type { ColliderVector3 } from "@/game/data/maps/kit/colliders";
import { PHYSICS_GROUPS } from "@/game/sim/physics/layers";

const MIN_DIRECTION_LENGTH = 1e-8;

/**
 * Rapier rebuilds its scene-query acceleration structures during
 * `World.step()`. Call these helpers after colliders have been created or
 * moved and at least one step has run.
 */

export interface RayCastOptions {
  origin: ColliderVector3;
  direction: ColliderVector3;
  maxDistance: number;
  /** Interaction groups for the query; defaults to every gameplay layer. */
  groups?: number;
  includeSensors?: boolean;
  excludeCollider?: RAPIER.Collider;
}

export interface PhysicsRayHit {
  collider: RAPIER.Collider;
  colliderHandle: number;
  distance: number;
  point: ColliderVector3;
  normal: ColliderVector3;
}

export interface ShapeCastOptions {
  shape:
    | { kind: "ball"; radius: number }
    | { kind: "capsule"; halfHeight: number; radius: number };
  position: ColliderVector3;
  direction: ColliderVector3;
  maxDistance: number;
  /** Stop when the shape is within this distance of a surface. */
  targetDistance?: number;
  groups?: number;
  includeSensors?: boolean;
  excludeCollider?: RAPIER.Collider;
}

export interface PhysicsShapeHit {
  collider: RAPIER.Collider;
  colliderHandle: number;
  distance: number;
  point: ColliderVector3;
  normal: ColliderVector3;
}

function normalized(
  direction: ColliderVector3,
): ColliderVector3 | null {
  const length = Math.hypot(
    direction.x,
    direction.y,
    direction.z,
  );

  if (
    !Number.isFinite(length) ||
    length < MIN_DIRECTION_LENGTH
  ) {
    return null;
  }

  return {
    x: direction.x / length,
    y: direction.y / length,
    z: direction.z / length,
  };
}

function validDistance(distance: number): boolean {
  return Number.isFinite(distance) && distance > 0;
}

function queryFlags(
  includeSensors: boolean,
): RAPIER.QueryFilterFlags | undefined {
  return includeSensors
    ? undefined
    : RAPIER.QueryFilterFlags.EXCLUDE_SENSORS;
}

export function castRay(
  world: RAPIER.World,
  {
    origin,
    direction,
    maxDistance,
    groups = PHYSICS_GROUPS.queryAll,
    includeSensors = false,
    excludeCollider,
  }: RayCastOptions,
): PhysicsRayHit | null {
  const unit = normalized(direction);

  if (!unit || !validDistance(maxDistance)) {
    return null;
  }

  const ray = new RAPIER.Ray(origin, unit);
  const hit = world.castRayAndGetNormal(
    ray,
    maxDistance,
    true,
    queryFlags(includeSensors),
    groups,
    excludeCollider,
  );

  if (!hit) {
    return null;
  }

  return {
    collider: hit.collider,
    colliderHandle: hit.collider.handle,
    distance: hit.timeOfImpact,
    point: {
      x: origin.x + unit.x * hit.timeOfImpact,
      y: origin.y + unit.y * hit.timeOfImpact,
      z: origin.z + unit.z * hit.timeOfImpact,
    },
    normal: {
      x: hit.normal.x,
      y: hit.normal.y,
      z: hit.normal.z,
    },
  };
}

function createCastShape(
  shape: ShapeCastOptions["shape"],
): RAPIER.Shape {
  if (!Number.isFinite(shape.radius) || shape.radius <= 0) {
    throw new Error("Shape-cast radius must be positive.");
  }

  if (shape.kind === "ball") {
    return new RAPIER.Ball(shape.radius);
  }

  if (
    !Number.isFinite(shape.halfHeight) ||
    shape.halfHeight < 0
  ) {
    throw new Error(
      "Shape-cast capsule half-height must be zero or greater.",
    );
  }

  return new RAPIER.Capsule(shape.halfHeight, shape.radius);
}

export function castShape(
  world: RAPIER.World,
  {
    shape,
    position,
    direction,
    maxDistance,
    targetDistance = 0,
    groups = PHYSICS_GROUPS.queryAll,
    includeSensors = false,
    excludeCollider,
  }: ShapeCastOptions,
): PhysicsShapeHit | null {
  const unit = normalized(direction);

  if (
    !unit ||
    !validDistance(maxDistance) ||
    !Number.isFinite(targetDistance) ||
    targetDistance < 0
  ) {
    return null;
  }

  const shapeVelocity = { x: unit.x, y: unit.y, z: unit.z };
  const hit = world.castShape(
    position,
    { x: 0, y: 0, z: 0, w: 1 },
    shapeVelocity,
    createCastShape(shape),
    targetDistance,
    maxDistance,
    false,
    queryFlags(includeSensors),
    groups,
    excludeCollider,
  );

  if (!hit) {
    return null;
  }

  return {
    collider: hit.collider,
    colliderHandle: hit.collider.handle,
    distance: hit.time_of_impact,
    point: {
      x: hit.witness1.x,
      y: hit.witness1.y,
      z: hit.witness1.z,
    },
    normal: {
      x: hit.normal1.x,
      y: hit.normal1.y,
      z: hit.normal1.z,
    },
  };
}
