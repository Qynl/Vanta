import RAPIER from "@dimforge/rapier3d-compat";

import type { StaticColliderSpec } from "@/game/data/maps/kit/colliders";

export interface BuiltCollider {
  /** Stable source id. Stairs expand to one id per generated step. */
  id: string;
  desc: RAPIER.ColliderDesc;
}

export interface ColliderKitOptions {
  defaultFriction?: number;
  defaultRestitution?: number;
}

interface ResolvedCollider {
  id: string;
  desc: RAPIER.ColliderDesc;
}

const DEFAULT_FRICTION = 0.82;

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite.`);
  }
}

function assertPositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
}

export function quaternionFromYaw(yaw: number): {
  x: number;
  y: number;
  z: number;
  w: number;
} {
  assertFinite(yaw, "Yaw");
  const half = yaw * 0.5;

  return {
    x: 0,
    y: Math.sin(half),
    z: 0,
    w: Math.cos(half),
  };
}

function applyCommon(
  desc: RAPIER.ColliderDesc,
  spec: StaticColliderSpec,
  friction: number,
  restitution: number,
): RAPIER.ColliderDesc {
  desc
    .setTranslation(spec.position.x, spec.position.y, spec.position.z)
    .setRotation(quaternionFromYaw(spec.yaw ?? 0))
    .setFriction(spec.friction ?? friction)
    .setRestitution(spec.restitution ?? restitution);

  return desc;
}

/**
 * A ramp is a solid triangular prism. Its low edge sits at `position.y` on
 * local -Z and its high edge reaches `position.y + height` on local +Z.
 */
export function createRampColliderDesc(
  width: number,
  length: number,
  height: number,
): RAPIER.ColliderDesc {
  assertPositive(width, "Ramp width");
  assertPositive(length, "Ramp length");
  assertPositive(height, "Ramp height");

  const halfWidth = width * 0.5;
  const halfLength = length * 0.5;
  const points = new Float32Array([
    -halfWidth,
    0,
    -halfLength,
    halfWidth,
    0,
    -halfLength,
    -halfWidth,
    0,
    halfLength,
    halfWidth,
    0,
    halfLength,
    -halfWidth,
    height,
    halfLength,
    halfWidth,
    height,
    halfLength,
  ]);
  const desc = RAPIER.ColliderDesc.convexHull(points);

  if (!desc) {
    throw new Error("Ramp collider points did not produce a convex hull.");
  }

  return desc;
}

function createBox(
  spec: Extract<StaticColliderSpec, { kind: "box" }>,
): RAPIER.ColliderDesc {
  assertPositive(spec.size.x, `Box "${spec.id}" width`);
  assertPositive(spec.size.y, `Box "${spec.id}" height`);
  assertPositive(spec.size.z, `Box "${spec.id}" depth`);

  return RAPIER.ColliderDesc.cuboid(
    spec.size.x * 0.5,
    spec.size.y * 0.5,
    spec.size.z * 0.5,
  );
}

function createCylinder(
  spec: Extract<StaticColliderSpec, { kind: "cylinder" }>,
): RAPIER.ColliderDesc {
  assertPositive(spec.radius, `Cylinder "${spec.id}" radius`);
  assertPositive(spec.height, `Cylinder "${spec.id}" height`);

  return RAPIER.ColliderDesc.cylinder(spec.height * 0.5, spec.radius);
}

function createStairs(
  spec: Extract<StaticColliderSpec, { kind: "stairs" }>,
  friction: number,
  restitution: number,
): ResolvedCollider[] {
  assertPositive(spec.width, `Stairs "${spec.id}" width`);
  assertPositive(spec.rise, `Stairs "${spec.id}" rise`);
  assertPositive(spec.run, `Stairs "${spec.id}" run`);

  if (!Number.isInteger(spec.steps) || spec.steps < 1) {
    throw new Error(`Stairs "${spec.id}" must have at least one step.`);
  }

  const totalDepth = spec.steps * spec.run;
  const yaw = spec.yaw ?? 0;
  const rotation = quaternionFromYaw(yaw);
  const colliders: ResolvedCollider[] = [];

  for (let index = 0; index < spec.steps; index += 1) {
    const stepHeight = spec.rise * (index + 1);
    const localZ = -totalDepth * 0.5 + spec.run * (index + 0.5);
    const worldX = spec.position.x + Math.sin(yaw) * localZ;
    const worldZ = spec.position.z + Math.cos(yaw) * localZ;
    const desc = RAPIER.ColliderDesc.cuboid(
      spec.width * 0.5,
      stepHeight * 0.5,
      spec.run * 0.5,
    )
      .setTranslation(
        worldX,
        spec.position.y + stepHeight * 0.5,
        worldZ,
      )
      .setRotation(rotation)
      .setFriction(spec.friction ?? friction)
      .setRestitution(spec.restitution ?? restitution);

    colliders.push({
      id: `${spec.id}:step-${index + 1}`,
      desc,
    });
  }

  return colliders;
}

export function buildStaticColliderDescs(
  specs: readonly StaticColliderSpec[],
  {
    defaultFriction = DEFAULT_FRICTION,
    defaultRestitution = 0,
  }: ColliderKitOptions = {},
): BuiltCollider[] {
  const built: BuiltCollider[] = [];

  for (const spec of specs) {
    if (spec.kind === "stairs") {
      built.push(
        ...createStairs(spec, defaultFriction, defaultRestitution),
      );
      continue;
    }

    let desc: RAPIER.ColliderDesc;

    switch (spec.kind) {
      case "box":
        desc = createBox(spec);
        break;
      case "ramp":
        desc = createRampColliderDesc(
          spec.width,
          spec.length,
          spec.height,
        );
        break;
      case "cylinder":
        desc = createCylinder(spec);
        break;
    }

    applyCommon(desc, spec, defaultFriction, defaultRestitution);
    built.push({ id: spec.id, desc });
  }

  return built;
}
