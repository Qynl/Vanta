import { describe, expect, it } from "vitest";

import {
  MOVEMENT_TUNING,
  NEUTRAL_MOVEMENT_INPUT,
  PlayerMotor,
  type MovementInput,
} from "@/game/sim/player/Movement";

const STEP = 1 / 60;

function input(overrides: Partial<MovementInput> = {}): MovementInput {
  return { ...NEUTRAL_MOVEMENT_INPUT, ...overrides };
}

function run(
  motor: PlayerMotor,
  ticks: number,
  movement: MovementInput,
  grounded = true,
  crouched = false,
): void {
  for (let tick = 0; tick < ticks; tick += 1) {
    motor.step(movement, STEP, { grounded, crouched });
    motor.resolveContact(grounded);
  }
}

describe("player movement motor", () => {
  it("responds on the first tick and reaches sprint speed", () => {
    const motor = new PlayerMotor(Math.PI);
    const walking = input({ forward: 1, sprint: true });

    motor.step(walking, STEP, { grounded: true, crouched: false });
    const first = motor.snapshot;

    expect(first.velocity.z).toBeGreaterThan(1);
    expect(first.horizontalSpeed).toBeLessThan(
      MOVEMENT_TUNING.walkSpeed,
    );

    run(motor, 30, walking);
    const running = motor.snapshot;

    expect(running.phase).toBe("sprinting");
    expect(running.horizontalSpeed).toBeCloseTo(
      MOVEMENT_TUNING.sprintSpeed,
      4,
    );
    expect(running.velocity.z).toBeGreaterThan(0);
  });

  it("decelerates with ground friction and stops", () => {
    const motor = new PlayerMotor();
    run(motor, 30, input({ forward: 1 }));

    expect(motor.snapshot.horizontalSpeed).toBeCloseTo(
      MOVEMENT_TUNING.walkSpeed,
      4,
    );

    run(motor, 30, NEUTRAL_MOVEMENT_INPUT);

    expect(motor.snapshot.horizontalSpeed).toBeCloseTo(0, 5);
    expect(motor.snapshot.phase).toBe("idle");
  });

  it("jumps immediately, preserves air control and reports landing impact", () => {
    const motor = new PlayerMotor(Math.PI);
    run(motor, 5, NEUTRAL_MOVEMENT_INPUT);
    const jump = motor.step(
      input({ forward: 1, jumpHeld: true, jumpPressed: true }),
      STEP,
      { grounded: true, crouched: false },
    );

    expect(jump.jumped).toBe(true);
    expect(jump.displacement.y).toBeGreaterThan(0);
    motor.resolveContact(false);
    expect(motor.snapshot.grounded).toBe(false);
    expect(motor.snapshot.phase).toBe("airborne");

    const apexSpeed = motor.snapshot.verticalSpeed;
    expect(apexSpeed).toBeGreaterThan(0);

    for (let tick = 0; tick < 30; tick += 1) {
      motor.step(input({ forward: 1 }), STEP, {
        grounded: false,
        crouched: false,
      });
      motor.resolveContact(false);
    }

    expect(motor.snapshot.velocity.y).toBeLessThan(0);

    motor.step(input({ forward: 1 }), STEP, {
      grounded: false,
      crouched: false,
    });
    motor.resolveContact(true);

    expect(motor.landed).toBe(true);
    expect(motor.impactSpeed).toBeGreaterThan(
      MOVEMENT_TUNING.landingImpactThreshold,
    );
    expect(motor.snapshot.grounded).toBe(true);
  });

  it("supports coyote time and queued jump buffering", () => {
    const coyote = new PlayerMotor();
    run(coyote, 3, NEUTRAL_MOVEMENT_INPUT);
    coyote.step(NEUTRAL_MOVEMENT_INPUT, STEP, {
      grounded: false,
      crouched: false,
    });
    coyote.resolveContact(false);

    const jump = coyote.step(
      input({ jumpHeld: true, jumpPressed: true }),
      STEP,
      { grounded: false, crouched: false },
    );
    expect(jump.jumped).toBe(true);

    const buffered = new PlayerMotor();
    run(buffered, 3, NEUTRAL_MOVEMENT_INPUT);

    // Spend enough airtime that coyote cannot satisfy this jump; only the
    // queued press can convert it when the feet touch down.
    run(buffered, 10, NEUTRAL_MOVEMENT_INPUT, false);
    buffered.step(input({ jumpHeld: true, jumpPressed: true }), STEP, {
      grounded: false,
      crouched: false,
    });
    buffered.resolveContact(false);
    buffered.step(input({ jumpHeld: true }), STEP, {
      grounded: false,
      crouched: false,
    });
    buffered.resolveContact(false);

    const landingJump = buffered.step(input({ jumpHeld: true }), STEP, {
      grounded: true,
      crouched: false,
    });
    expect(landingJump.jumped).toBe(true);
  });

  it("limits crouched speed without a separate movement path", () => {
    const motor = new PlayerMotor();
    run(
      motor,
      45,
      input({ forward: 1, sprint: true, crouch: true }),
      true,
      true,
    );

    expect(motor.snapshot.phase).toBe("crouching");
    expect(motor.snapshot.horizontalSpeed).toBeCloseTo(
      MOVEMENT_TUNING.crouchSpeed,
      4,
    );
    expect(motor.snapshot.sprinting).toBe(false);
  });

  it("is deterministic for the same command sequence", () => {
    const simulate = () => {
      const motor = new PlayerMotor(Math.PI * 0.25);
      const frames: number[] = [];

      for (let tick = 0; tick < 120; tick += 1) {
        motor.step(
          input({
            forward: 1,
            right: tick > 30 ? 0.35 : 0,
            sprint: tick > 50,
            jumpHeld: tick > 70,
            jumpPressed: tick === 72,
          }),
          STEP,
          { grounded: tick < 70, crouched: false },
        );
        motor.resolveContact(tick < 70);
        frames.push(motor.snapshot.horizontalSpeed);
      }

      return frames;
    };

    expect(simulate()).toEqual(simulate());
  });
});
