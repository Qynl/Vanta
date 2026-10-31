import { describe, expect, it } from "vitest";

import { HealthPool } from "@/game/sim/combat/damage";

describe("health pools", () => {
  it("absorbs damage in shield before health", () => {
    const pool = new HealthPool(100, 50);
    const first = pool.applyDamage(40);

    expect(first.shieldDamage).toBe(40);
    expect(first.healthDamage).toBe(0);
    expect(first.applied).toBe(40);
    expect(first.lethal).toBe(false);
    expect(pool.shield).toBe(10);
    expect(pool.health).toBe(100);
  });

  it("spills overflow into health and reports a lethal result", () => {
    const pool = new HealthPool(100, 50);
    const result = pool.applyDamage(170);

    expect(result.shieldDamage).toBe(50);
    expect(result.healthDamage).toBe(100);
    expect(result.applied).toBe(150);
    expect(result.overkill).toBe(20);
    expect(result.lethal).toBe(true);
    expect(pool.isAlive).toBe(false);
    expect(pool.health).toBe(0);
    expect(pool.shield).toBe(0);
  });

  it("ignores invalid damage, regenerates shield, and resets both resources", () => {
    const pool = new HealthPool(100, 100);

    expect(pool.applyDamage(-5).applied).toBe(0);
    expect(pool.applyDamage(Number.NaN).applied).toBe(0);
    expect(pool.applyDamage(Number.POSITIVE_INFINITY).applied).toBe(0);
    expect(pool.health).toBe(100);

    pool.applyDamage(60);
    expect(pool.restoreShield(25)).toBe(25);
    expect(pool.shield).toBe(65);
    expect(pool.restoreShield(100)).toBe(35);
    expect(pool.shield).toBe(100);

    pool.reset();

    expect(pool.health).toBe(100);
    expect(pool.shield).toBe(100);
    expect(pool.healthRatio).toBe(1);
    expect(pool.shieldRatio).toBe(1);
  });
});
