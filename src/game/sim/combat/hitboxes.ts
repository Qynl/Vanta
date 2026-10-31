import type { ColliderVector3 } from "@/game/data/maps/kit/colliders";
import type { HitZone } from "@/game/sim/events/SimEventBus";

const EPSILON = 1e-7;

export const TARGET_HITBOX = {
  height: 1.91,
  head: {
    centerY: 1.7,
    radius: 0.21,
  },
  torso: {
    centerY: 1.1,
    halfHeight: 0.24,
    radius: 0.28,
  },
  legs: {
    centerY: 0.45,
    halfHeight: 0.23,
    radius: 0.1,
    offsetX: 0.16,
  },
} as const;

export interface TargetHitboxPose {
  readonly position: ColliderVector3;
  readonly yaw: number;
}

export interface HitboxHit {
  readonly zone: HitZone;
  readonly distance: number;
  readonly point: ColliderVector3;
  readonly normal: ColliderVector3;
}

interface SphereHit {
  readonly distance: number;
  readonly point: ColliderVector3;
  readonly normal: ColliderVector3;
}

function normalize(direction: ColliderVector3): ColliderVector3 | null {
  const length = Math.hypot(direction.x, direction.y, direction.z);

  if (!Number.isFinite(length) || length < EPSILON) {
    return null;
  }

  return {
    x: direction.x / length,
    y: direction.y / length,
    z: direction.z / length,
  };
}

function add(
  point: ColliderVector3,
  direction: ColliderVector3,
  distance: number,
): ColliderVector3 {
  return {
    x: point.x + direction.x * distance,
    y: point.y + direction.y * distance,
    z: point.z + direction.z * distance,
  };
}

/**
 * Ray/sphere intersection for the head hitbox. Direction must be normalized.
 */
export function raySphereIntersection(
  origin: ColliderVector3,
  direction: ColliderVector3,
  center: ColliderVector3,
  radius: number,
  maxDistance: number,
): SphereHit | null {
  if (!Number.isFinite(radius) || radius <= 0 || maxDistance < 0) {
    return null;
  }

  const offset = {
    x: origin.x - center.x,
    y: origin.y - center.y,
    z: origin.z - center.z,
  };
  const b = 2 * (offset.x * direction.x + offset.y * direction.y + offset.z * direction.z);
  const c =
    offset.x * offset.x +
    offset.y * offset.y +
    offset.z * offset.z -
    radius * radius;
  const discriminant = b * b - 4 * c;

  if (discriminant < 0) {
    return null;
  }

  const root = Math.sqrt(discriminant);
  const near = (-b - root) / 2;
  const far = (-b + root) / 2;
  const distance =
    near >= -EPSILON && near <= maxDistance
      ? Math.max(0, near)
      : far >= -EPSILON && far <= maxDistance
        ? Math.max(0, far)
        : null;

  if (distance === null) {
    return null;
  }

  const point = add(origin, direction, distance);
  const normal = {
    x: (point.x - center.x) / radius,
    y: (point.y - center.y) / radius,
    z: (point.z - center.z) / radius,
  };

  return { distance, point, normal };
}

/**
 * Ray vs a vertical capsule. The cylinder body plus both hemispherical caps
 * are tested separately so torso and leg zones are genuine volumes rather than
 * approximations around a single sphere.
 */
export function rayVerticalCapsuleIntersection(
  origin: ColliderVector3,
  direction: ColliderVector3,
  center: ColliderVector3,
  halfHeight: number,
  radius: number,
  maxDistance: number,
): SphereHit | null {
  if (
    !Number.isFinite(halfHeight) ||
    halfHeight < 0 ||
    !Number.isFinite(radius) ||
    radius <= 0 ||
    maxDistance < 0
  ) {
    return null;
  }

  const localOrigin = {
    x: origin.x - center.x,
    y: origin.y - center.y,
    z: origin.z - center.z,
  };
  let nearest: SphereHit | null = null;

  const a = direction.x * direction.x + direction.z * direction.z;

  if (a > EPSILON) {
    const b = 2 * (localOrigin.x * direction.x + localOrigin.z * direction.z);
    const c =
      localOrigin.x * localOrigin.x +
      localOrigin.z * localOrigin.z -
      radius * radius;
    const discriminant = b * b - 4 * a * c;

    if (discriminant >= 0) {
      const root = Math.sqrt(discriminant);
      const candidates = [
        (-b - root) / (2 * a),
        (-b + root) / (2 * a),
      ];

      for (const distance of candidates) {
        if (distance < -EPSILON || distance > maxDistance) {
          continue;
        }

        const y = localOrigin.y + direction.y * distance;

        if (Math.abs(y) > halfHeight + EPSILON) {
          continue;
        }

        const point = add(origin, direction, Math.max(0, distance));
        const normal = normalize({
          x: point.x - center.x,
          y: 0,
          z: point.z - center.z,
        });

        if (!normal) {
          continue;
        }

        const hit = { distance: Math.max(0, distance), point, normal };

        if (!nearest || hit.distance < nearest.distance) {
          nearest = hit;
        }
      }
    }
  }

  for (const capSign of [-1, 1]) {
    const capCenter = {
      x: center.x,
      y: center.y + halfHeight * capSign,
      z: center.z,
    };
    const sphere = raySphereIntersection(
      origin,
      direction,
      capCenter,
      radius,
      maxDistance,
    );

    if (!sphere) {
      continue;
    }

    const localCapY = sphere.point.y - capCenter.y;

    if (
      (capSign > 0 && localCapY < -EPSILON) ||
      (capSign < 0 && localCapY > EPSILON)
    ) {
      continue;
    }

    if (!nearest || sphere.distance < nearest.distance) {
      nearest = sphere;
    }
  }

  return nearest;
}

function pickCloser(
  current: HitboxHit | null,
  candidate: HitboxHit | null,
): HitboxHit | null {
  if (!candidate) {
    return current;
  }

  if (!current || candidate.distance < current.distance) {
    return candidate;
  }

  return current;
}

/**
 * Resolves one hitscan ray against a target dummy's head, torso and two leg
 * volumes. Hit zones overlap at the seams; the nearest surface wins.
 */
export function resolveTargetHit(
  origin: ColliderVector3,
  direction: ColliderVector3,
  maxDistance: number,
  target: TargetHitboxPose,
): HitboxHit | null {
  const unit = normalize(direction);

  if (!unit) {
    return null;
  }

  const headCenter = {
    x: target.position.x,
    y: target.position.y + TARGET_HITBOX.head.centerY,
    z: target.position.z,
  };
  const head = raySphereIntersection(
    origin,
    unit,
    headCenter,
    TARGET_HITBOX.head.radius,
    maxDistance,
  );
  let nearest: HitboxHit | null = head
    ? { ...head, zone: "head" }
    : null;

  const torsoCenter = {
    x: target.position.x,
    y: target.position.y + TARGET_HITBOX.torso.centerY,
    z: target.position.z,
  };
  const torso = rayVerticalCapsuleIntersection(
    origin,
    unit,
    torsoCenter,
    TARGET_HITBOX.torso.halfHeight,
    TARGET_HITBOX.torso.radius,
    maxDistance,
  );
  nearest = pickCloser(
    nearest,
    torso ? { ...torso, zone: "torso" } : null,
  );

  const rightX = Math.cos(target.yaw);
  const rightZ = -Math.sin(target.yaw);

  for (const side of [-1, 1]) {
    const legCenter = {
      x:
        target.position.x +
        rightX * TARGET_HITBOX.legs.offsetX * side,
      y: target.position.y + TARGET_HITBOX.legs.centerY,
      z:
        target.position.z +
        rightZ * TARGET_HITBOX.legs.offsetX * side,
    };
    const leg = rayVerticalCapsuleIntersection(
      origin,
      unit,
      legCenter,
      TARGET_HITBOX.legs.halfHeight,
      TARGET_HITBOX.legs.radius,
      maxDistance,
    );
    nearest = pickCloser(
      nearest,
      leg ? { ...leg, zone: "legs" } : null,
    );
  }

  return nearest;
}
