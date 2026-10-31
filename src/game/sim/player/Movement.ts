export interface MovementVector3 {
  x: number;
  y: number;
  z: number;
}

export interface MovementInput {
  /** Local forward axis, in the range -1..1. */
  forward: number;
  /** Local right axis, in the range -1..1. */
  right: number;
  sprint: boolean;
  crouch: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
}

export type MovementPhase =
  | "idle"
  | "walking"
  | "sprinting"
  | "crouching"
  | "airborne";

export interface MovementEnvironment {
  grounded: boolean;
  crouched: boolean;
}

export interface MovementStep {
  displacement: MovementVector3;
  jumped: boolean;
  sprinting: boolean;
}

export interface MovementSnapshot {
  velocity: MovementVector3;
  horizontalSpeed: number;
  verticalSpeed: number;
  grounded: boolean;
  crouched: boolean;
  sprinting: boolean;
  phase: MovementPhase;
  yaw: number;
  coyoteRemaining: number;
  jumpBufferRemaining: number;
  airTime: number;
}

export const MOVEMENT_TUNING = {
  walkSpeed: 6.6,
  sprintSpeed: 9.4,
  crouchSpeed: 3.2,
  groundAcceleration: 62,
  airAcceleration: 16,
  groundDeceleration: 48,
  jumpSpeed: 7.2,
  gravity: 23.5,
  terminalVelocity: 45,
  coyoteSeconds: 0.1,
  jumpBufferSeconds: 0.12,
  groundStickSpeed: 2,
  landingImpactThreshold: 2.2,
} as const;

export const NEUTRAL_MOVEMENT_INPUT: MovementInput = {
  forward: 0,
  right: 0,
  sprint: false,
  crouch: false,
  jumpHeld: false,
  jumpPressed: false,
};

function clampAxis(value: number): number {
  return Number.isFinite(value)
    ? Math.max(-1, Math.min(1, value))
    : 0;
}

function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) {
    return Math.min(current + maxDelta, target);
  }

  if (current > target) {
    return Math.max(current - maxDelta, target);
  }

  return target;
}

function horizontalSpeed(velocity: MovementVector3): number {
  return Math.hypot(velocity.x, velocity.z);
}

function normalizeYaw(yaw: number): number {
  return Number.isFinite(yaw)
    ? Math.atan2(Math.sin(yaw), Math.cos(yaw))
    : 0;
}

/**
 * Deterministic ground/air motor. It owns velocity and jump timing only; the
 * simulation supplies collision results from the kinematic character. No DOM,
 * renderer or physics imports make the response curve directly testable.
 */
export class PlayerMotor {
  private velocity: MovementVector3 = { x: 0, y: 0, z: 0 };
  private yaw = 0;
  private grounded = false;
  private crouched = false;
  private sprinting = false;
  private coyoteRemaining = 0;
  private jumpBufferRemaining = 0;
  private airTime = 0;
  private startedGrounded = false;
  private preImpactVerticalVelocity = 0;
  private lastStepJumped = false;
  private landedThisStep = false;
  private landingImpact = 0;

  constructor(yaw = 0) {
    this.yaw = normalizeYaw(yaw);
  }

  get snapshot(): MovementSnapshot {
    return {
      velocity: { ...this.velocity },
      horizontalSpeed: horizontalSpeed(this.velocity),
      verticalSpeed: this.velocity.y,
      grounded: this.grounded,
      crouched: this.crouched,
      sprinting: this.sprinting,
      phase: this.phase,
      yaw: this.yaw,
      coyoteRemaining: this.coyoteRemaining,
      jumpBufferRemaining: this.jumpBufferRemaining,
      airTime: this.airTime,
    };
  }

  get landed(): boolean {
    return this.landedThisStep;
  }

  get impactSpeed(): number {
    return this.landingImpact;
  }

  get phase(): MovementPhase {
    if (!this.grounded) {
      return "airborne";
    }

    if (this.crouched) {
      return "crouching";
    }

    if (this.sprinting && horizontalSpeed(this.velocity) > 0.5) {
      return "sprinting";
    }

    return horizontalSpeed(this.velocity) > 0.2 ? "walking" : "idle";
  }

  setYaw(yaw: number): void {
    this.yaw = normalizeYaw(yaw);
  }

  reset(yaw = 0): void {
    this.velocity = { x: 0, y: 0, z: 0 };
    this.yaw = normalizeYaw(yaw);
    this.grounded = false;
    this.crouched = false;
    this.sprinting = false;
    this.coyoteRemaining = 0;
    this.jumpBufferRemaining = 0;
    this.airTime = 0;
    this.startedGrounded = false;
    this.preImpactVerticalVelocity = 0;
    this.lastStepJumped = false;
    this.landedThisStep = false;
    this.landingImpact = 0;
  }

  step(
    input: MovementInput,
    deltaSeconds: number,
    environment: MovementEnvironment,
  ): MovementStep {
    const delta = Number.isFinite(deltaSeconds)
      ? Math.max(0, Math.min(deltaSeconds, 0.05))
      : 0;

    this.startedGrounded = this.grounded;
    this.grounded = environment.grounded;
    this.crouched = environment.crouched;
    this.lastStepJumped = false;
    this.landedThisStep = false;
    this.landingImpact = 0;

    if (this.grounded) {
      this.coyoteRemaining = MOVEMENT_TUNING.coyoteSeconds;
      this.airTime = 0;
    } else {
      this.coyoteRemaining = Math.max(
        0,
        this.coyoteRemaining - delta,
      );
      this.airTime += delta;
    }

    if (input.jumpPressed) {
      this.jumpBufferRemaining = MOVEMENT_TUNING.jumpBufferSeconds;
    } else {
      this.jumpBufferRemaining = Math.max(
        0,
        this.jumpBufferRemaining - delta,
      );
    }

    const canJump =
      input.jumpHeld &&
      this.jumpBufferRemaining > 0 &&
      this.coyoteRemaining > 0 &&
      !input.crouch;

    if (canJump) {
      this.velocity.y = MOVEMENT_TUNING.jumpSpeed;
      this.coyoteRemaining = 0;
      this.jumpBufferRemaining = 0;
      this.grounded = false;
      this.lastStepJumped = true;
    }

    const forwardInput = clampAxis(input.forward);
    const rightInput = clampAxis(input.right);
    const inputMagnitude = Math.hypot(forwardInput, rightInput);
    const normalizedForward =
      inputMagnitude > 1 ? forwardInput / inputMagnitude : forwardInput;
    const normalizedRight =
      inputMagnitude > 1 ? rightInput / inputMagnitude : rightInput;

    this.sprinting =
      input.sprint &&
      !input.crouch &&
      normalizedForward > 0.15;

    const maxSpeed = input.crouch
      ? MOVEMENT_TUNING.crouchSpeed
      : this.sprinting
        ? MOVEMENT_TUNING.sprintSpeed
        : MOVEMENT_TUNING.walkSpeed;

    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);
    const magnitude = Math.min(1, Math.hypot(normalizedForward, normalizedRight));
    const targetX =
      (forwardX * normalizedForward + rightX * normalizedRight) *
      maxSpeed *
      magnitude;
    const targetZ =
      (forwardZ * normalizedForward + rightZ * normalizedRight) *
      maxSpeed *
      magnitude;

    if (magnitude > 0.01) {
      const acceleration = this.grounded
        ? MOVEMENT_TUNING.groundAcceleration
        : MOVEMENT_TUNING.airAcceleration;
      const maxDelta = acceleration * delta;

      this.velocity.x = approach(
        this.velocity.x,
        targetX,
        maxDelta,
      );
      this.velocity.z = approach(
        this.velocity.z,
        targetZ,
        maxDelta,
      );
    } else if (this.grounded) {
      const speed = horizontalSpeed(this.velocity);
      const nextSpeed = Math.max(
        0,
        speed - MOVEMENT_TUNING.groundDeceleration * delta,
      );
      const scale = speed > 0.0001 ? nextSpeed / speed : 0;

      this.velocity.x *= scale;
      this.velocity.z *= scale;
    }

    this.preImpactVerticalVelocity = this.velocity.y;

    if (this.grounded && this.velocity.y <= 0) {
      this.velocity.y = -MOVEMENT_TUNING.groundStickSpeed;
    } else {
      this.velocity.y = Math.max(
        -MOVEMENT_TUNING.terminalVelocity,
        this.velocity.y - MOVEMENT_TUNING.gravity * delta,
      );
    }

    return {
      displacement: {
        x: this.velocity.x * delta,
        y: this.velocity.y * delta,
        z: this.velocity.z * delta,
      },
      jumped: this.lastStepJumped,
      sprinting: this.sprinting,
    };
  }

  /**
   * Applies the character-controller result after a physics step. Landing
   * impact uses the downward speed entering the tick, not the snapped result.
   */
  resolveContact(grounded: boolean): void {
    this.grounded = grounded;
    this.landedThisStep =
      grounded && !this.startedGrounded && !this.lastStepJumped;

    if (this.landedThisStep) {
      this.landingImpact = Math.max(
        0,
        -this.preImpactVerticalVelocity,
      );
      this.airTime = 0;
      this.coyoteRemaining = MOVEMENT_TUNING.coyoteSeconds;
    }

    if (grounded && !this.lastStepJumped) {
      this.velocity.y = 0;
    }

    this.lastStepJumped = false;
  }
}
