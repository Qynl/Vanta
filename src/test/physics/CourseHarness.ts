import { PHYSICS_STEP_SECONDS } from "@/game/sim/physics/FixedStep";
import type { KinematicCharacter } from "@/game/sim/physics/KinematicCharacter";
import type { PhysicsWorld } from "@/game/sim/physics/PhysicsWorld";

export interface CourseSample {
  tick: number;
  x: number;
  y: number;
  z: number;
  grounded: boolean;
}

export interface CourseRunOptions {
  physics: PhysicsWorld;
  character: KinematicCharacter;
  horizontalSpeed?: number;
  jumpSpeed?: number;
  jumpAtZ?: number;
  stopAtZ?: number;
  maxTicks?: number;
}

export interface CourseRun {
  samples: CourseSample[];
  jumpTriggered: boolean;
  landedAfterJump: boolean;
  reachedEnd: boolean;
  maxHeight: number;
}

/**
 * Drives the real Rapier character controller along the qualification lane at
 * a fixed 60 Hz. This is intentionally a harness, not a player controller:
 * M4 owns input, jump buffering and camera integration.
 */
export function runPhysicsCourse({
  physics,
  character,
  horizontalSpeed = 4,
  jumpSpeed = 6.4,
  jumpAtZ = 7.25,
  stopAtZ = 21.3,
  maxTicks = 1_200,
}: CourseRunOptions): CourseRun {
  const samples: CourseSample[] = [];
  let verticalVelocity = 0;
  let jumpTriggered = false;
  let landedAfterJump = false;
  let reachedEnd = false;
  let maxHeight = Number.NEGATIVE_INFINITY;

  for (let tick = 0; tick < maxTicks; tick += 1) {
    const before = character.position;

    if (before.z >= stopAtZ) {
      reachedEnd = true;
      break;
    }

    if (!jumpTriggered && before.z >= jumpAtZ) {
      jumpTriggered = true;
      verticalVelocity = jumpSpeed;
    }

    verticalVelocity = Math.max(
      verticalVelocity - 9.81 * PHYSICS_STEP_SECONDS,
      -40,
    );

    const result = character.move({
      x: 0,
      y: verticalVelocity * PHYSICS_STEP_SECONDS,
      z: horizontalSpeed * PHYSICS_STEP_SECONDS,
    });

    physics.step();

    const after = character.position;
    maxHeight = Math.max(maxHeight, after.y);

    if (
      jumpTriggered &&
      result.grounded &&
      after.z > jumpAtZ + 1.5 &&
      after.y > 1.7
    ) {
      landedAfterJump = true;
    }

    if (result.grounded && verticalVelocity < 0) {
      verticalVelocity = 0;
    }

    samples.push({
      tick,
      x: after.x,
      y: after.y,
      z: after.z,
      grounded: result.grounded,
    });

    if (after.y < -10) {
      break;
    }
  }

  return {
    samples,
    jumpTriggered,
    landedAfterJump,
    reachedEnd,
    maxHeight,
  };
}
