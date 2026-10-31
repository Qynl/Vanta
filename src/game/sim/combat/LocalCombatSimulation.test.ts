import { beforeAll, describe, expect, it } from "vitest";

import {
  PROVING_GROUNDS,
  PROVING_GROUNDS_HAZARDS,
  PROVING_GROUNDS_SPAWN,
  PROVING_GROUNDS_TARGETS,
} from "@/game/data/maps/provingGrounds/provingGrounds";
import {
  LocalCombatSimulation,
  PLAYER_RESPAWN_TICKS,
  type CombatTickInput,
} from "@/game/sim/combat/LocalCombatSimulation";
import { TARGET_HITBOX } from "@/game/sim/combat/hitboxes";
import { initPhysics, PhysicsWorld } from "@/game/sim/physics/PhysicsWorld";
import { compileStaticCourse } from "@/game/sim/physics/StaticCourse";
import type { SimEvent } from "@/game/sim/events/SimEventBus";

const SAFE_INPUT = {
  playerPosition: PROVING_GROUNDS_SPAWN,
  aimOrigin: {
    x: PROVING_GROUNDS_SPAWN.x,
    y: PROVING_GROUNDS_SPAWN.y + 0.72,
    z: PROVING_GROUNDS_SPAWN.z,
  },
  aimDirection: { x: 0, y: 0, z: 1 },
  viewYaw: Math.PI,
  fireHeld: false,
  reloadPressed: false,
  horizontalSpeed: 0,
  grounded: true,
  crouched: false,
} satisfies CombatTickInput;

function aimAtHead(
  target: (typeof PROVING_GROUNDS_TARGETS)[number],
): CombatTickInput {
  const origin = SAFE_INPUT.aimOrigin;
  const head = {
    x: target.position.x,
    y: target.position.y + TARGET_HITBOX.head.centerY,
    z: target.position.z,
  };
  const length = Math.hypot(
    head.x - origin.x,
    head.y - origin.y,
    head.z - origin.z,
  );

  return {
    ...SAFE_INPUT,
    aimDirection: {
      x: (head.x - origin.x) / length,
      y: (head.y - origin.y) / length,
      z: (head.z - origin.z) / length,
    },
  };
}

async function createFixture() {
  const physics = await PhysicsWorld.create();
  const course = compileStaticCourse(physics.world, PROVING_GROUNDS);
  const combat = new LocalCombatSimulation({
    physics,
    targets: PROVING_GROUNDS_TARGETS,
    hazards: PROVING_GROUNDS_HAZARDS,
    seed: 1234,
  });
  physics.step();

  return {
    physics,
    combat,
    dispose: () => {
      combat.dispose();
      course.dispose();
      physics.dispose();
    },
  };
}

function ofType<T extends SimEvent["type"]>(
  events: readonly SimEvent[],
  type: T,
): Extract<SimEvent, { type: T }>[] {
  return events.filter(
    (event): event is Extract<SimEvent, { type: T }> =>
      event.type === type,
  );
}

describe("local combat simulation", () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it("shoots a real target, applies headshot damage and eliminates it", async () => {
    const { combat, dispose } = await createFixture();

    try {
      const target = PROVING_GROUNDS_TARGETS[0]!;
      const attack = {
        ...aimAtHead(target),
        fireHeld: true,
      };
      const events: SimEvent[] = [];

      for (let tick = 0; tick < 35; tick += 1) {
        events.push(...combat.step(attack).events);
      }

      const damage = ofType(events, "damage");
      const eliminations = ofType(events, "elimination");
      const shots = ofType(events, "shot");

      expect(shots.length).toBeGreaterThanOrEqual(4);
      expect(damage.length).toBeGreaterThanOrEqual(4);
      expect(eliminations).toHaveLength(1);
      expect(damage[0]?.zone).toBe("head");
      expect(damage[0]?.amount).toBeGreaterThan(40);
      expect(eliminations[0]).toMatchObject({
        killerId: "player",
        victimId: target.id,
        headshot: true,
        cause: "rifle",
      });

      const targetState = combat.snapshot.targets.find(
        (candidate) => candidate.id === target.id,
      );
      expect(targetState?.alive).toBe(false);
      expect(targetState?.health).toBe(0);
      expect(targetState?.shield).toBe(0);
      expect(combat.snapshot.match.eliminations).toBe(1);
      expect(combat.snapshot.match.headshotEliminations).toBe(1);
      expect(combat.snapshot.match.accuracy).toBeGreaterThan(0);
      expect(combat.eventBus.pendingCount).toBe(0);
    } finally {
      dispose();
    }
  });

  it("respawns a downed dummy on the deterministic four-second timer", async () => {
    const { combat, dispose } = await createFixture();

    try {
      const target = PROVING_GROUNDS_TARGETS[0]!;
      const attack = {
        ...aimAtHead(target),
        fireHeld: true,
      };

      for (let tick = 0; tick < 35; tick += 1) {
        combat.step(attack);
      }

      expect(combat.snapshot.targets[0]?.alive).toBe(false);
      const respawnEvents: SimEvent[] = [];

      for (let tick = 0; tick < 260; tick += 1) {
        const result = combat.step(SAFE_INPUT);
        respawnEvents.push(...result.events);

        if (respawnEvents.some((event) => event.type === "respawn")) {
          break;
        }
      }

      expect(
        ofType(respawnEvents, "respawn").some(
          (event) => event.entityId === target.id,
        ),
      ).toBe(true);
      expect(combat.snapshot.targets[0]?.alive).toBe(true);
      expect(combat.snapshot.targets[0]?.health).toBe(100);
      expect(combat.snapshot.targets[0]?.shield).toBe(50);
    } finally {
      dispose();
    }
  });

  it("uses world geometry to block shots before target hitboxes", async () => {
    const { combat, dispose } = await createFixture();

    try {
      const target = PROVING_GROUNDS_TARGETS[0]!;
      const result = combat.step({
        ...SAFE_INPUT,
        playerPosition: {
          x: target.position.x,
          y: target.position.y + 0.91,
          z: target.position.z + 30,
        },
        aimOrigin: {
          x: target.position.x,
          y: target.position.y + 1.63,
          z: target.position.z + 30,
        },
        aimDirection: { x: 0, y: 0, z: -1 },
        fireHeld: true,
      });
      const shots = ofType(result.events, "shot");
      const damage = ofType(result.events, "damage");

      expect(shots).toHaveLength(1);
      expect(shots[0]?.result).toBe("world");
      expect(damage).toHaveLength(0);
      expect(combat.snapshot.targets[0]?.health).toBe(100);
    } finally {
      dispose();
    }
  });

  it("regenerates shield after the post-damage delay", async () => {
    const { combat, dispose } = await createFixture();
    const hazard = PROVING_GROUNDS_HAZARDS[0]!;
    const insideHazard: CombatTickInput = {
      ...SAFE_INPUT,
      playerPosition: {
        x: hazard.position.x,
        y: hazard.position.y + 0.91,
        z: hazard.position.z,
      },
      aimOrigin: {
        x: hazard.position.x,
        y: hazard.position.y + 1.63,
        z: hazard.position.z,
      },
    };

    try {
      combat.step(insideHazard);
      expect(combat.snapshot.player.shield).toBeLessThan(100);

      for (let tick = 0; tick < 360; tick += 1) {
        combat.step(SAFE_INPUT);
      }

      expect(combat.snapshot.player.shield).toBe(100);
      expect(combat.snapshot.player.health).toBe(100);
      expect(combat.snapshot.player.alive).toBe(true);
    } finally {
      dispose();
    }
  });

  it("kills the player on the damage pad and respawns with full vitals", async () => {
    const { combat, dispose } = await createFixture();
    const hazard = PROVING_GROUNDS_HAZARDS[0]!;
    const insideHazard: CombatTickInput = {
      ...SAFE_INPUT,
      playerPosition: {
        x: hazard.position.x,
        y: hazard.position.y + 0.91,
        z: hazard.position.z,
      },
      aimOrigin: {
        x: hazard.position.x,
        y: hazard.position.y + 1.63,
        z: hazard.position.z,
      },
    };

    try {
      const events: SimEvent[] = [];
      let diedAtTick = -1;

      for (let tick = 0; tick < 300; tick += 1) {
        const result = combat.step(insideHazard);
        events.push(...result.events);

        if (!combat.isPlayerAlive) {
          diedAtTick = combat.snapshot.tick;
          break;
        }
      }

      expect(diedAtTick).toBeGreaterThan(0);
      expect(combat.snapshot.player.alive).toBe(false);
      expect(combat.snapshot.player.respawnTicksRemaining).toBe(
        PLAYER_RESPAWN_TICKS,
      );
      expect(
        ofType(events, "elimination").some(
          (event) =>
            event.victimId === "player" && event.cause === "hazard",
        ),
      ).toBe(true);
      expect(ofType(events, "damage").length).toBeGreaterThan(5);

      let respawned = false;
      const respawnEvents: SimEvent[] = [];

      for (let tick = 0; tick < 170; tick += 1) {
        const result = combat.step(SAFE_INPUT);
        respawnEvents.push(...result.events);

        if (result.playerRespawned) {
          respawned = true;
          break;
        }
      }

      expect(respawned).toBe(true);
      expect(combat.snapshot.player.alive).toBe(true);
      expect(combat.snapshot.player.health).toBe(100);
      expect(combat.snapshot.player.shield).toBe(100);
      expect(combat.snapshot.match.deaths).toBe(1);
      expect(combat.snapshot.weapon.ammo).toBe(30);
      expect(
        ofType(respawnEvents, "respawn").some(
          (event) => event.entityId === "player",
        ),
      ).toBe(true);
    } finally {
      dispose();
    }
  });
});
