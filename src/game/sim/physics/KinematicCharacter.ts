import RAPIER from "@dimforge/rapier3d-compat";

import type { ColliderVector3 } from "@/game/data/maps/kit/colliders";
import { PHYSICS_GROUPS } from "@/game/sim/physics/layers";

const DEGREES_TO_RADIANS = Math.PI / 180;

export const CHARACTER_TUNING = {
  radius: 0.35,
  halfHeight: 0.55,
  offset: 0.02,
  maxStepHeight: 0.32,
  minStepWidth: 0.2,
  snapToGroundDistance: 0.22,
  maxSlopeClimbDegrees: 48,
  minSlopeSlideDegrees: 38,
} as const;

export interface KinematicCharacterOptions {
  position: ColliderVector3;
  radius?: number;
  halfHeight?: number;
  offset?: number;
  collisionGroups?: number;
}

export interface CharacterMoveResult {
  desired: ColliderVector3;
  movement: ColliderVector3;
  position: ColliderVector3;
  grounded: boolean;
  collisionCount: number;
}

/**
 * A capsule controller for kinematically driven players and bots. `move`
 * calculates and queues the next kinematic translation; the owning simulation
 * calls `world.step()` once for the whole tick.
 */
export class KinematicCharacter {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  readonly controller: RAPIER.KinematicCharacterController;
  private readonly collisionGroups: number;
  private readonly capsuleRadius: number;
  private readonly headProbe: RAPIER.Ball;
  private capsuleHalfHeight: number;
  private disposed = false;
  private lastGrounded = false;

  constructor(
    private readonly world: RAPIER.World,
    {
      position,
      radius = CHARACTER_TUNING.radius,
      halfHeight = CHARACTER_TUNING.halfHeight,
      offset = CHARACTER_TUNING.offset,
      collisionGroups = PHYSICS_GROUPS.player,
    }: KinematicCharacterOptions,
  ) {
    if (!Number.isFinite(radius) || radius <= 0) {
      throw new Error("Character radius must be positive.");
    }

    if (!Number.isFinite(halfHeight) || halfHeight < 0) {
      throw new Error(
        "Character half-height must be zero or greater.",
      );
    }

    this.collisionGroups = collisionGroups;
    this.capsuleRadius = radius;
    this.capsuleHalfHeight = halfHeight;
    this.headProbe = new RAPIER.Ball(radius);
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
        position.x,
        position.y,
        position.z,
      ),
    );

    this.collider = world.createCollider(
      RAPIER.ColliderDesc.capsule(halfHeight, radius)
        .setCollisionGroups(collisionGroups)
        .setFriction(0),
      this.body,
    );

    this.controller = world.createCharacterController(offset);
    this.controller.setUp({ x: 0, y: 1, z: 0 });
    this.controller.setSlideEnabled(true);
    this.controller.enableAutostep(
      CHARACTER_TUNING.maxStepHeight,
      CHARACTER_TUNING.minStepWidth,
      false,
    );
    this.controller.enableSnapToGround(
      CHARACTER_TUNING.snapToGroundDistance,
    );
    this.controller.setMaxSlopeClimbAngle(
      CHARACTER_TUNING.maxSlopeClimbDegrees * DEGREES_TO_RADIANS,
    );
    this.controller.setMinSlopeSlideAngle(
      CHARACTER_TUNING.minSlopeSlideDegrees * DEGREES_TO_RADIANS,
    );
    this.controller.setApplyImpulsesToDynamicBodies(false);
  }

  get position(): ColliderVector3 {
    const translation = this.body.translation();

    return {
      x: translation.x,
      y: translation.y,
      z: translation.z,
    };
  }

  get grounded(): boolean {
    return this.lastGrounded;
  }

  get halfHeight(): number {
    return this.capsuleHalfHeight;
  }

  get colliderHalfHeight(): number {
    return this.collider.halfHeight();
  }

  get contourRadius(): number {
    return this.capsuleRadius;
  }

  /**
   * Resizes the capsule while keeping the feet planted. Standing up is refused
   * when the expanded crown would intersect world geometry, so low ceilings
   * cannot be clipped through. Call before the tick's `move`.
   */
  setCapsuleHalfHeight(nextHalfHeight: number): boolean {
    if (this.disposed) {
      throw new Error("Character controller has been disposed.");
    }

    if (!Number.isFinite(nextHalfHeight) || nextHalfHeight < 0) {
      throw new Error(
        "Character half-height must be zero or greater.",
      );
    }

    const delta = nextHalfHeight - this.capsuleHalfHeight;

    if (Math.abs(delta) < 1e-6) {
      return true;
    }

    const position = this.body.translation();

    if (delta > 0) {
      const headroomProbe = {
        x: position.x,
        y: position.y + this.capsuleHalfHeight + delta * 2,
        z: position.z,
      };
      const obstruction = this.world.intersectionWithShape(
        headroomProbe,
        { x: 0, y: 0, z: 0, w: 1 },
        this.headProbe,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
        this.collisionGroups,
        this.collider,
      );

      if (obstruction) {
        return false;
      }
    }

    this.collider.setHalfHeight(nextHalfHeight);
    this.capsuleHalfHeight = nextHalfHeight;
    const nextCenter = {
      x: position.x,
      y: position.y + delta,
      z: position.z,
    };
    this.body.setTranslation(nextCenter, true);
    this.body.setNextKinematicTranslation(nextCenter);
    this.world.propagateModifiedBodyPositionsToColliders();

    return true;
  }

  move(desiredTranslation: ColliderVector3): CharacterMoveResult {
    if (this.disposed) {
      throw new Error("Character controller has been disposed.");
    }

    this.controller.computeColliderMovement(
      this.collider,
      desiredTranslation,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
      this.collisionGroups,
    );

    const movement = this.controller.computedMovement();
    const current = this.body.translation();
    const next = {
      x: current.x + movement.x,
      y: current.y + movement.y,
      z: current.z + movement.z,
    };

    this.body.setNextKinematicTranslation(next);
    this.lastGrounded = this.controller.computedGrounded();

    return {
      desired: {
        x: desiredTranslation.x,
        y: desiredTranslation.y,
        z: desiredTranslation.z,
      },
      movement: {
        x: movement.x,
        y: movement.y,
        z: movement.z,
      },
      position: next,
      grounded: this.lastGrounded,
      collisionCount: this.controller.numComputedCollisions(),
    };
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.world.removeCharacterController(this.controller);
    this.world.removeRigidBody(this.body);
  }
}
