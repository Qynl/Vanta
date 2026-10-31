import type {
  ColliderVector3,
  StaticCourseLayout,
} from "@/game/data/maps/kit/colliders";
import {
  MOVEMENT_RANGE,
  MOVEMENT_RANGE_FALL_Y,
  MOVEMENT_RANGE_SPAWN,
  MOVEMENT_RANGE_YAW,
} from "@/game/data/maps/kit/movementRange";
import { PHYSICS_STEP_SECONDS } from "@/game/sim/physics/FixedStep";
import { KinematicCharacter } from "@/game/sim/physics/KinematicCharacter";
import { PhysicsWorld } from "@/game/sim/physics/PhysicsWorld";
import { compileStaticCourse } from "@/game/sim/physics/StaticCourse";
import {
  NEUTRAL_MOVEMENT_INPUT,
  PlayerMotor,
  type MovementInput,
  type MovementPhase,
  type MovementVector3,
} from "@/game/sim/player/Movement";
import { PLAYER_STANCE } from "@/game/sim/player/stance";

export { PLAYER_STANCE } from "@/game/sim/player/stance";

export interface PlayerSimulationOptions {
  layout?: StaticCourseLayout;
  spawn?: ColliderVector3;
  yaw?: number;
  resetBelowY?: number;
}

export interface PlayerSimulationSnapshot {
  position: MovementVector3;
  velocity: MovementVector3;
  horizontalSpeed: number;
  verticalSpeed: number;
  grounded: boolean;
  crouched: boolean;
  sprinting: boolean;
  phase: MovementPhase;
  yaw: number;
  tick: number;
  respawns: number;
  landed: boolean;
  impactSpeed: number;
  capsuleHalfHeight: number;
  eyeOffset: number;
}

export interface PlayerSimulationStep {
  snapshot: PlayerSimulationSnapshot;
  jumped: boolean;
  respawned: boolean;
}

/**
 * Local authoritative player sim. It has no renderer or DOM dependency and can
 * run the exact same fixed step in the browser, a headless test and a future
 * direct-session host.
 */
export class LocalPlayerSimulation {
  readonly physics: PhysicsWorld;
  private readonly course: ReturnType<typeof compileStaticCourse>;
  private readonly character: KinematicCharacter;
  private readonly motor: PlayerMotor;
  private readonly spawn: ColliderVector3;
  private readonly resetBelowY: number;
  private crouched = false;
  private ticks = 0;
  private respawns = 0;
  private disposed = false;
  private yaw: number;

  private constructor(
    physics: PhysicsWorld,
    layout: StaticCourseLayout,
    spawn: ColliderVector3,
    yaw: number,
    resetBelowY: number,
  ) {
    this.physics = physics;
    this.spawn = { ...spawn };
    this.yaw = yaw;
    this.resetBelowY = resetBelowY;
    this.motor = new PlayerMotor(yaw);
    this.course = compileStaticCourse(physics.world, layout);
    this.character = new KinematicCharacter(physics.world, {
      position: spawn,
      radius: PLAYER_STANCE.radius,
      halfHeight: PLAYER_STANCE.standingHalfHeight,
    });
  }

  static async create(
    options: PlayerSimulationOptions = {},
  ): Promise<LocalPlayerSimulation> {
    const physics = await PhysicsWorld.create();

    try {
      return new LocalPlayerSimulation(
        physics,
        options.layout ?? MOVEMENT_RANGE,
        options.spawn ?? MOVEMENT_RANGE_SPAWN,
        options.yaw ?? MOVEMENT_RANGE_YAW,
        options.resetBelowY ?? MOVEMENT_RANGE_FALL_Y,
      );
    } catch (error) {
      physics.dispose();
      throw error;
    }
  }

  get snapshot(): PlayerSimulationSnapshot {
    return this.createSnapshot(false, false, 0);
  }

  setYaw(yaw: number): void {
    if (!Number.isFinite(yaw)) {
      return;
    }

    this.yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    this.motor.setYaw(this.yaw);
  }

  step(
    input: MovementInput = NEUTRAL_MOVEMENT_INPUT,
    deltaSeconds = PHYSICS_STEP_SECONDS,
  ): PlayerSimulationStep {
    if (this.disposed) {
      throw new Error("Player simulation has been disposed.");
    }

    this.applyStance(input.crouch);
    const movement = this.motor.step(input, deltaSeconds, {
      grounded: this.character.grounded,
      crouched: this.crouched,
    });

    this.character.move(movement.displacement);
    this.physics.step();
    this.motor.resolveContact(this.character.grounded);
    this.ticks += 1;

    let respawned = false;

    if (this.character.position.y < this.resetBelowY) {
      this.respawn();
      respawned = true;
    }

    return {
      snapshot: this.createSnapshot(
        movement.jumped,
        respawned,
        movement.jumped ? 0 : this.motor.impactSpeed,
      ),
      jumped: movement.jumped,
      respawned,
    };
  }

  respawn(): void {
    const standing = this.character.setCapsuleHalfHeight(
      PLAYER_STANCE.standingHalfHeight,
    );

    if (!standing) {
      // The spawn is open air; if this ever fails, force the reset translation
      // first and retry so a blocked stand cannot trap the player.
      this.teleport(this.spawn);
      this.character.setCapsuleHalfHeight(
        PLAYER_STANCE.standingHalfHeight,
      );
    } else {
      this.teleport(this.spawn);
    }

    this.crouched = false;
    this.motor.reset(this.yaw);
    this.respawns += 1;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.character.dispose();
    this.course.dispose();
    this.physics.dispose();
  }

  private applyStance(wantsCrouch: boolean): void {
    if (wantsCrouch && !this.crouched) {
      if (
        this.character.setCapsuleHalfHeight(
          PLAYER_STANCE.crouchedHalfHeight,
        )
      ) {
        this.crouched = true;
      }
      return;
    }

    if (!wantsCrouch && this.crouched) {
      if (
        this.character.setCapsuleHalfHeight(
          PLAYER_STANCE.standingHalfHeight,
        )
      ) {
        this.crouched = false;
      }
    }
  }

  private teleport(position: ColliderVector3): void {
    this.character.body.setTranslation(position, true);
    this.character.body.setNextKinematicTranslation(position);
  }

  private createSnapshot(
    jumped: boolean,
    respawned: boolean,
    impactSpeed: number,
  ): PlayerSimulationSnapshot {
    const position = this.character.position;
    const motor = this.motor.snapshot;

    return {
      position: { ...position },
      velocity: { ...motor.velocity },
      horizontalSpeed: motor.horizontalSpeed,
      verticalSpeed: motor.verticalSpeed,
      grounded: this.character.grounded,
      crouched: this.crouched,
      sprinting: motor.sprinting,
      phase: motor.phase,
      yaw: this.yaw,
      tick: this.ticks,
      respawns: this.respawns,
      landed: !jumped && !respawned && impactSpeed > 0,
      impactSpeed,
      capsuleHalfHeight: this.character.colliderHalfHeight,
      eyeOffset: this.crouched
        ? PLAYER_STANCE.crouchedEyeOffset
        : PLAYER_STANCE.standingEyeOffset,
    };
  }
}
