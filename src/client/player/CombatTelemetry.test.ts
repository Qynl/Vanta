import { describe, expect, it } from "vitest";

import {
  CombatTelemetry,
} from "@/client/player/CombatTelemetry";
import type { CombatSnapshot } from "@/game/sim/combat/LocalCombatSimulation";
import type {
  DamageEvent,
  EliminationEvent,
} from "@/game/sim/events/SimEventBus";

function snapshot(tick: number): CombatSnapshot {
  return {
    tick,
    playerPosition: { x: 0, y: 9, z: 0 },
    viewYaw: Math.PI,
    player: {
      alive: true,
      health: 100,
      shield: 100,
      maxHealth: 100,
      maxShield: 100,
      respawnTicksRemaining: 0,
    },
    weapon: {
      id: "proto_vk7",
      name: "VK-7 Prototype",
      shortName: "VK-7",
      ammo: 29,
      reserve: 210,
      magazineSize: 30,
      reloading: false,
      reloadProgress: 0,
      spreadRadians: 0.002,
      shotsFired: 1,
    },
    targets: [
      {
        id: "target_cqc",
        name: "T-01 / CQC",
        alive: true,
        health: 100,
        shield: 2,
        maxHealth: 100,
        maxShield: 50,
        distanceMetres: 17,
      },
    ],
    match: {
      phase: "live",
      tick,
      eliminations: 0,
      headshotEliminations: 0,
      deaths: 0,
      shotsFired: 1,
      shotsHit: 1,
      accuracy: 1,
      respawnTicksRemaining: 0,
    },
  };
}

const damage: DamageEvent = {
  type: "damage",
  tick: 2,
  sourceId: "player",
  targetId: "target_cqc",
  weaponId: "proto_vk7",
  zone: "head",
  amount: 48,
  shieldDamage: 48,
  healthDamage: 0,
  lethal: false,
  sourcePosition: { x: 0, y: 9.6, z: 0 },
  point: { x: 0, y: 9.7, z: 17 },
};

const elimination: EliminationEvent = {
  type: "elimination",
  tick: 3,
  killerId: "player",
  killerName: "Operator",
  victimId: "target_cqc",
  victimName: "T-01 / CQC",
  cause: "rifle",
  weaponId: "proto_vk7",
  headshot: true,
};

describe("combat telemetry", () => {
  it("forces immediate hit feedback, then throttles state-only updates", () => {
    const telemetry = new CombatTelemetry(snapshot(0));
    let notifications = 0;
    const unsubscribe = telemetry.subscribe(() => {
      notifications += 1;
    });

    telemetry.publish(snapshot(1), [], 100);
    expect(notifications).toBe(1);

    telemetry.publish(snapshot(2), [damage], 110);
    expect(notifications).toBe(2);
    expect(telemetry.getSnapshot().lastHit?.zone).toBe("head");
    expect(telemetry.getSnapshot().lastHit?.targetName).toBe(
      "T-01 / CQC",
    );
    expect(telemetry.getSnapshot().state.tick).toBe(2);

    telemetry.publish(snapshot(3), [], 120);
    expect(notifications).toBe(2);
    expect(telemetry.getSnapshot().state.tick).toBe(2);

    telemetry.publish(snapshot(3), [], 400);
    expect(notifications).toBe(3);
    expect(telemetry.getSnapshot().state.tick).toBe(3);
    unsubscribe();
    telemetry.dispose();
  });

  it("records player damage and structured killfeed entries", () => {
    const telemetry = new CombatTelemetry(snapshot(0));
    const playerDamage: DamageEvent = {
      ...damage,
      targetId: "player",
      sourceId: "hazard_calibration",
      weaponId: null,
      zone: null,
      amount: 14,
      shieldDamage: 14,
      healthDamage: 0,
      sourcePosition: { x: 7, y: 9, z: -2.5 },
    };

    telemetry.publish(snapshot(3), [elimination, playerDamage], 10);

    const current = telemetry.getSnapshot();
    expect(current.killfeed).toHaveLength(1);
    expect(current.killfeed[0]?.victimName).toBe("T-01 / CQC");
    expect(current.killfeed[0]?.headshot).toBe(true);
    expect(current.lastDamage?.amount).toBe(14);
    expect(current.lastDamage?.sourceId).toBe("hazard_calibration");
    expect(current.lastHit).toBeNull();
    telemetry.dispose();
  });
});
