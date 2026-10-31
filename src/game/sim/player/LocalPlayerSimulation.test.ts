import { describe, expect, it } from "vitest";

import type { StaticCourseLayout } from "@/game/data/maps/kit/colliders";
import { MOVEMENT_RANGE_SPAWN } from "@/game/data/maps/kit/movementRange";
import {
  LocalPlayerSimulation,
  PLAYER_STANCE,
} from "@/game/sim/player/LocalPlayerSimulation";
import {
  NEUTRAL_MOVEMENT_INPUT,
  type MovementInput,
} from "@/game/sim/player/Movement";

function input(overrides: Partial<MovementInput> = {}): MovementInput {
  return { ...NEUTRAL_MOVEMENT_INPUT, ...overrides };
}

async function settle(
  simulation: LocalPlayerSimulation,
  ticks = 20,
): Promise<void> {
  for (let tick = 0; tick < ticks; tick += 1) {
    simulation.step(NEUTRAL_MOVEMENT_INPUT);
  }
}

describe("local player simulation", () => {
  it("settles on the course and accelerates from input immediately", async () => {
    const simulation = await LocalPlayerSimulation.create();

    try {
      await settle(simulation);
      const start = simulation.snapshot;

      expect(start.grounded).toBe(true);
      expect(start.position.y).toBeGreaterThan(8.8);
      expect(start.position.y).toBeLessThan(8.95);

      simulation.step(input({ forward: 1, sprint: true }));
      const moving = simulation.snapshot;

      expect(moving.horizontalSpeed).toBeGreaterThan(0);
      expect(moving.position.z).toBeGreaterThan(start.position.z);
      expect(moving.tick).toBe(start.tick + 1);
    } finally {
      simulation.dispose();
    }
  });

  it("lowers the real capsule and eye offset while crouching", async () => {
    const simulation = await LocalPlayerSimulation.create();

    try {
      await settle(simulation);
      const standing = simulation.snapshot;

      for (let tick = 0; tick < 3; tick += 1) {
        simulation.step(input({ crouch: true }));
      }

      const crouched = simulation.snapshot;

      expect(crouched.crouched).toBe(true);
      expect(crouched.capsuleHalfHeight).toBeCloseTo(
        PLAYER_STANCE.crouchedHalfHeight,
        5,
      );
      expect(crouched.eyeOffset).toBe(
        PLAYER_STANCE.crouchedEyeOffset,
      );
      expect(crouched.position.y).toBeCloseTo(
        standing.position.y -
          (PLAYER_STANCE.standingHalfHeight -
            PLAYER_STANCE.crouchedHalfHeight),
        1,
      );

      simulation.step(input());
      const risen = simulation.snapshot;

      expect(risen.crouched).toBe(false);
      expect(risen.capsuleHalfHeight).toBeCloseTo(
        PLAYER_STANCE.standingHalfHeight,
        5,
      );
    } finally {
      simulation.dispose();
    }
  });

  it("runs the ramp, clears the gap and climbs to the high deck", async () => {
    const simulation = await LocalPlayerSimulation.create();

    try {
      await settle(simulation);
      let jumped = false;
      let snapshot = simulation.snapshot;

      for (let tick = 0; tick < 900; tick += 1) {
        const shouldJump =
          !jumped &&
          snapshot.grounded &&
          snapshot.position.z > 51.4;

        if (shouldJump) {
          jumped = true;
        }

        const step = simulation.step(
          input({
            forward: 1,
            sprint: true,
            jumpHeld: shouldJump,
            jumpPressed: shouldJump,
          }),
        );
        snapshot = step.snapshot;

        if (snapshot.position.z > 67.2 && snapshot.grounded) {
          break;
        }
      }

      for (let tick = 0; tick < 10; tick += 1) {
        simulation.step(NEUTRAL_MOVEMENT_INPUT);
      }

      snapshot = simulation.snapshot;

      expect(jumped).toBe(true);
      expect(snapshot.respawns).toBe(0);
      expect(snapshot.position.z).toBeGreaterThan(67.2);
      expect(snapshot.position.y).toBeCloseTo(11.4, 1);
      expect(snapshot.grounded).toBe(true);
      expect(snapshot.position.y).toBeGreaterThan(
        MOVEMENT_RANGE_SPAWN.y,
      );
      expect(Number.isFinite(snapshot.horizontalSpeed)).toBe(true);
    } finally {
      simulation.dispose();
    }
  });

  it("refuses to stand under a low ceiling until the crown is clear", async () => {
    const lowCeiling: StaticCourseLayout = {
      id: "low-ceiling-test",
      name: "Low ceiling test",
      colliders: [
        {
          id: "floor",
          kind: "box",
          position: { x: 0, y: -0.5, z: -2 },
          size: { x: 12, y: 1, z: 18 },
        },
        {
          id: "ceiling",
          kind: "box",
          position: { x: 0, y: 1.9, z: -4 },
          size: { x: 4, y: 0.4, z: 4 },
        },
      ],
    };
    const simulation = await LocalPlayerSimulation.create({
      layout: lowCeiling,
      spawn: { x: 0, y: 0.91, z: 0 },
      yaw: 0,
      resetBelowY: -10,
    });

    try {
      for (let tick = 0; tick < 10; tick += 1) {
        simulation.step(NEUTRAL_MOVEMENT_INPUT);
      }
      expect(simulation.snapshot.grounded).toBe(true);

      for (let tick = 0; tick < 80; tick += 1) {
        simulation.step(input({ forward: 1, crouch: true }));
      }
      expect(simulation.snapshot.crouched).toBe(true);
      expect(simulation.snapshot.position.z).toBeLessThan(-3.2);

      for (let tick = 0; tick < 3; tick += 1) {
        simulation.step(input());
      }

      expect(simulation.snapshot.crouched).toBe(true);
      expect(simulation.snapshot.capsuleHalfHeight).toBeCloseTo(
        PLAYER_STANCE.crouchedHalfHeight,
        5,
      );

      simulation.setYaw(Math.PI);
      for (let tick = 0; tick < 90; tick += 1) {
        simulation.step(input({ forward: 1, crouch: true }));
      }
      expect(simulation.snapshot.position.z).toBeGreaterThan(-1.5);

      simulation.step(input());
      expect(simulation.snapshot.crouched).toBe(false);
      expect(simulation.snapshot.capsuleHalfHeight).toBeCloseTo(
        PLAYER_STANCE.standingHalfHeight,
        5,
      );
    } finally {
      simulation.dispose();
    }
  });

  it("respawns if the lane is missed and can be disposed twice safely", async () => {
    const simulation = await LocalPlayerSimulation.create();

    try {
      await settle(simulation);
      simulation.setYaw(0);

      let respawned = false;

      for (let tick = 0; tick < 240; tick += 1) {
        const step = simulation.step(
          input({ forward: 1, sprint: true }),
        );

        if (step.respawned) {
          respawned = true;
          break;
        }
      }

      expect(respawned).toBe(true);
      expect(simulation.snapshot.respawns).toBeGreaterThan(0);
      expect(simulation.snapshot.position.z).toBeCloseTo(
        MOVEMENT_RANGE_SPAWN.z,
        2,
      );
    } finally {
      simulation.dispose();
      simulation.dispose();
    }
  });
});
